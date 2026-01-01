// Simple script to replace Prisma imports
const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Only fix files that import PrismaClient
    if (!content.includes("import { PrismaClient } from '@prisma/client'")) {
      return false;
    }

    // Check if already uses correct import
    if (content.includes("import prisma") && content.includes("from '@/lib/prisma'")) {
      return false;
    }

    // Replace the import statement
    content = content.replace(
      /import \{ PrismaClient \} from '@prisma\/client';/g,
      "import prisma from '@/lib/prisma';"
    );

    // Remove any standalone PrismaClient instantiation blocks
    // Pattern 1: let prisma; if (process.env.NODE_ENV...
    content = content.replace(
      /\n\n\/\/ Prisma singleton pattern[\s\S]*?prisma = global\.prisma;\s*\}/g,
      ''
    );

    // Pattern 2: const prisma = global.prisma || new PrismaClient();
    content = content.replace(
      /\n\nconst prisma = global\.prisma \|\| new PrismaClient\(\);[\s\S]*?global\.prisma = prisma;/g,
      ''
    );

    // Pattern 3: let prisma;  if (process.env... (without comment)
    content = content.replace(
      /\n\nlet prisma;\s*if \(process\.env\.NODE_ENV === 'production'\)[\s\S]*?prisma = global\.prisma;\s*\}/g,
      ''
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${path.relative(process.cwd(), filePath)} - ${error.message}`);
    return false;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixedCount += walkDir(filePath);
    } else if (file.endsWith('.js') && !filePath.includes('lib\\prisma.js')) {
      if (fixFile(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

const pagesApiDir = path.join(__dirname, 'pages', 'api');
console.log('🔧 Fixing Prisma imports...\n');

const fixedCount = walkDir(pagesApiDir);

console.log(`\n✅ Fixed ${fixedCount} files!`);
