/**
 * Setup local database connection
 * This script checks and sets up DATABASE_URL for local development
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found. Creating from .env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env from .env.example');
  } else {
    // Create basic .env
    fs.writeFileSync(envPath, 'DATABASE_URL="file:./prisma/dev.db"\n');
    console.log('✅ Created basic .env file');
  }
}

// Read .env
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if DATABASE_URL exists
if (!envContent.includes('DATABASE_URL')) {
  console.log('📝 Adding DATABASE_URL to .env...');
  envContent += '\n# Database connection\n';
  envContent += '# For local SQLite (development):\n';
  envContent += 'DATABASE_URL="file:./prisma/dev.db"\n';
  envContent += '\n# For Neon PostgreSQL (production/Vercel):\n';
  envContent += '# DATABASE_URL="postgresql://user:password@host/db?sslmode=require"\n';
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Added DATABASE_URL to .env');
} else {
  console.log('✅ DATABASE_URL already exists in .env');
}

// Check current DATABASE_URL value
const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
if (match) {
  const dbUrl = match[1];
  console.log(`\n📊 Current DATABASE_URL: ${dbUrl}`);
  
  if (dbUrl.startsWith('file:')) {
    console.log('✅ Using SQLite for local development');
  } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    console.log('✅ Using PostgreSQL');
  } else {
    console.log('⚠️  DATABASE_URL format might be incorrect');
  }
}

console.log('\n✅ Setup complete!');

