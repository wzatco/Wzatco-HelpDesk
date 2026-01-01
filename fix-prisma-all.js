// Script to automatically fix Prisma singleton pattern in all API files
const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: Standard singleton pattern
    const pattern1Regex = /import \{ PrismaClient \} from '@prisma\/client';\s*(?:\/\/ Prisma singleton pattern\s*)?let prisma;\s*if \(process\.env\.NODE_ENV === 'production'\) \{\s*prisma = new PrismaClient\(\);\s*\} else \{\s*if \(!global\.prisma\) \{\s*global\.prisma = new PrismaClient\(\);\s*\}\s*prisma = global\.prisma;\s*\}/gs;

    // Pattern 2: Compact singleton pattern
    const pattern2Regex = /import \{ PrismaClient \} from '@prisma\/client';\s*const prisma = global\.prisma \|\| new PrismaClient\(\);\s*if \(process\.env\.NODE_ENV !== 'production'\) global\.prisma = prisma;/gs;

    const replacement = `import prisma, { ensurePrismaConnected } from '@/lib/prisma';`;

    if (pattern1Regex.test(content)) {
      content = content.replace(pattern1Regex, replacement);
      modified = true;
    } else if (pattern2Regex.test(content)) {
      content = content.replace(pattern2Regex, replacement);
      modified = true;
    }

    // Add ensurePrismaConnected() after try { in handler
    if (modified && content.includes('export default async function handler')) {
      // Find try blocks that don't already have ensurePrismaConnected
      if (!content.includes('await ensurePrismaConnected()')) {
        // Match: try { followed by newline and indent
        const tryRegex = /(export default async function handler[^{]*\{[^}]*?)\s+(try\s*\{\s*\n)(\s+)/;
        const match = content.match(tryRegex);
        
        if (match) {
          const indent = match[3];
          const replacement = match[1] + '\n  ' + match[2] + indent + 'await ensurePrismaConnected();\n' + indent;
          content = content.replace(tryRegex, replacement);
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
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
    } else if (file.endsWith('.js') && !file.includes('prisma.js')) {
      if (fixFile(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

// Main execution
const pagesApiDir = path.join(__dirname, 'pages', 'api');
console.log('🔧 Starting Prisma singleton fix...\n');
console.log(`Scanning: ${pagesApiDir}\n`);

const fixedCount = walkDir(pagesApiDir);

console.log(`\n✅ Fixed ${fixedCount} files!`);
console.log('\n📝 Review changes with: git diff');
console.log('📝 Test with: npm run build');

