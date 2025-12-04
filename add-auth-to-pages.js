/**
 * Script to add authentication to all admin pages
 * Run: node add-auth-to-pages.js
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

function addAuthToPage(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has getServerSideProps
  if (content.includes('getServerSideProps')) {
    console.log(`⏭️  Skipping ${filePath} - already has getServerSideProps`);
    return false;
  }
  
  // Check if it's a page component (has export default)
  if (!content.includes('export default')) {
    console.log(`⏭️  Skipping ${filePath} - not a page component`);
    return false;
  }
  
  // Add import if not present
  if (!content.includes("from '../../../lib/withAuth'") && !content.includes("from '../../lib/withAuth'") && !content.includes("from '../../../../lib/withAuth'") && !content.includes("from '../../../../../lib/withAuth'")) {
    // Calculate correct import path: from pages/admin/X/Y.js to lib/withAuth
    // pages/admin/agents/index.js -> ../../../lib/withAuth (3 levels up)
    const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, 'lib'));
    const importPath = relativePath.replace(/\\/g, '/') + '/withAuth';
    
    // Find last import statement
    const importMatch = content.match(/(import.*from.*['"]\S+['"];?\s*\n)/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      content = content.slice(0, insertIndex) + `import { withAuth } from '${importPath}';\n` + content.slice(insertIndex);
    }
  }
  
  // Add getServerSideProps at the end
  if (!content.trim().endsWith('export const getServerSideProps = withAuth();')) {
    // Find the last closing brace of the component
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex > 0) {
      content = content.slice(0, lastBraceIndex + 1) + '\n\nexport const getServerSideProps = withAuth();\n' + content.slice(lastBraceIndex + 1);
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Added auth to ${filePath}`);
  return true;
}

// Main execution
const pages = getAllAdminPages(adminPagesDir);
console.log(`Found ${pages.length} admin pages\n`);

let updated = 0;
pages.forEach(page => {
  if (addAuthToPage(page)) {
    updated++;
  }
});

console.log(`\n✅ Updated ${updated} pages with authentication`);

