/**
 * Fix incorrect withAuth import paths
 */

const fs = require('fs');
const path = require('path');

const adminPagesDir = path.join(__dirname, 'pages', 'admin');

function getAllAdminPages(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllAdminPages(filePath, fileList);
    } else if (file.endsWith('.js') && file !== 'login.js') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixImportPath(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('withAuth')) {
    return false;
  }
  
  // Calculate correct path: from pages/admin/X/Y.js to lib/withAuth
  const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, 'lib'));
  const correctPath = relativePath.replace(/\\/g, '/') + '/withAuth';
  
  // Replace any incorrect withAuth import
  const importRegex = /import\s*{\s*withAuth\s*}\s*from\s*['"]([^'"]+)['"]/;
  const match = content.match(importRegex);
  
  if (match && match[1] !== correctPath) {
    content = content.replace(importRegex, `import { withAuth } from '${correctPath}'`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${filePath}: ${match[1]} -> ${correctPath}`);
    return true;
  }
  
  return false;
}

const pages = getAllAdminPages(adminPagesDir);
let fixed = 0;

pages.forEach(page => {
  if (fixImportPath(page)) {
    fixed++;
  }
});

console.log(`\n✅ Fixed ${fixed} import paths`);

