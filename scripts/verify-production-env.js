/**
 * Script to verify .env.production.local has all required variables
 * Run: node scripts/verify-production-env.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.production.local');

// All required variables from PRODUCTION_ENV_VARIABLES.md
const requiredVars = {
  // Critical (Required for Basic Functionality)
  'DATABASE_URL': 'Database connection',
  'JWT_SECRET': 'Authentication tokens',
  'NEXTAUTH_SECRET': 'NextAuth sessions',
  'NEXT_PUBLIC_BASE_URL': 'Application base URL',
  
  // Important (Required for Email Features)
  'MAIL_HOST': 'SMTP server',
  'MAIL_PORT': 'SMTP port',
  'MAIL_ENCRYPTION': 'SMTP encryption',
  'MAIL_USERNAME': 'SMTP username',
  'MAIL_PASSWORD': 'SMTP password',
  'MAIL_FROM_ADDRESS': 'Sender email',
  'MAIL_FROM_NAME': 'Sender name',
  'MAIL_REPLY_TO': 'Reply-to address',
  'MAIL_DEBUG': 'Email debug mode',
  
  // Application Configuration
  'NODE_ENV': 'Environment mode',
  'PORT': 'Server port',
  'CLIENT_URL': 'Socket.IO CORS URL',
  
  // Optional (Feature-Specific)
  'HMAC_SECRET': 'API key encryption (optional, falls back to JWT_SECRET)',
  'GOOGLE_CLIENT_ID': 'Google OAuth (optional if using Admin UI)',
  'GOOGLE_CLIENT_SECRET': 'Google OAuth (optional if using Admin UI)',
  'OPENAI_API_KEY': 'AI chat features (optional if using Admin UI)',
  'ANTHROPIC_API_KEY': 'Alternative AI provider (optional if using Admin UI)',
};

// Check if file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.production.local file not found!');
  console.log('   Run: node scripts/create-production-env.js');
  process.exit(1);
}

// Read file
const fileContent = fs.readFileSync(envPath, 'utf8');

// Parse variables (simple regex - matches KEY="VALUE" or KEY=VALUE)
const envVars = {};
const lines = fileContent.split('\n');
lines.forEach(line => {
  // Skip comments and empty lines
  if (line.trim().startsWith('#') || !line.trim()) return;
  
  // Match KEY="VALUE" or KEY=VALUE
  const match = line.match(/^([A-Z_]+)=["']?([^"']+)["']?/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

console.log('🔍 Verifying .env.production.local...\n');

// Check required variables
let allPresent = true;
let missingVars = [];
let placeholderVars = [];

console.log('📋 Variable Status:\n');

// Critical variables
console.log('🔴 CRITICAL (Required for Basic Functionality):');
Object.keys(requiredVars).slice(0, 4).forEach(varName => {
  if (envVars[varName]) {
    const hasPlaceholder = envVars[varName].includes('YOUR_') || 
                         envVars[varName].includes('yourdomain') ||
                         envVars[varName].includes('CHANGE_THIS');
    if (hasPlaceholder) {
      console.log(`  ⚠️  ${varName} - Present but has placeholder value`);
      placeholderVars.push(varName);
    } else {
      console.log(`  ✅ ${varName} - Present`);
    }
  } else {
    console.log(`  ❌ ${varName} - MISSING!`);
    missingVars.push(varName);
    allPresent = false;
  }
});

// Important variables
console.log('\n🟡 IMPORTANT (Required for Email Features):');
Object.keys(requiredVars).slice(4, 13).forEach(varName => {
  if (envVars[varName]) {
    const hasPlaceholder = envVars[varName].includes('YOUR_') || 
                         envVars[varName].includes('yourdomain');
    if (hasPlaceholder) {
      console.log(`  ⚠️  ${varName} - Present but has placeholder value`);
      placeholderVars.push(varName);
    } else {
      console.log(`  ✅ ${varName} - Present`);
    }
  } else {
    console.log(`  ❌ ${varName} - MISSING!`);
    missingVars.push(varName);
    allPresent = false;
  }
});

// Application configuration
console.log('\n🟢 APPLICATION CONFIGURATION:');
['NODE_ENV', 'PORT', 'CLIENT_URL'].forEach(varName => {
  if (envVars[varName]) {
    const hasPlaceholder = envVars[varName].includes('yourdomain');
    if (hasPlaceholder) {
      console.log(`  ⚠️  ${varName} - Present but has placeholder value`);
      placeholderVars.push(varName);
    } else {
      console.log(`  ✅ ${varName} - Present`);
    }
  } else {
    console.log(`  ❌ ${varName} - MISSING!`);
    missingVars.push(varName);
    allPresent = false;
  }
});

// Optional variables
console.log('\n🔵 OPTIONAL (Feature-Specific):');
Object.keys(requiredVars).slice(16).forEach(varName => {
  if (envVars[varName]) {
    const hasPlaceholder = envVars[varName].includes('your-') || 
                         envVars[varName].includes('sk-your');
    if (hasPlaceholder) {
      console.log(`  ⚠️  ${varName} - Present (optional, has placeholder)`);
    } else {
      console.log(`  ✅ ${varName} - Present`);
    }
  } else {
    console.log(`  ⚪ ${varName} - Not set (optional)`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

if (missingVars.length > 0) {
  console.log(`\n❌ MISSING VARIABLES (${missingVars.length}):`);
  missingVars.forEach(v => console.log(`   - ${v}: ${requiredVars[v]}`));
  allPresent = false;
}

if (placeholderVars.length > 0) {
  console.log(`\n⚠️  PLACEHOLDER VALUES (${placeholderVars.length} - Update before production):`);
  placeholderVars.forEach(v => console.log(`   - ${v}: ${requiredVars[v]}`));
}

const totalVars = Object.keys(requiredVars).length;
const presentVars = totalVars - missingVars.length;
console.log(`\n✅ Variables Present: ${presentVars}/${totalVars}`);

if (allPresent && placeholderVars.length === 0) {
  console.log('\n🎉 SUCCESS! All variables are present and configured!');
  console.log('   Your .env.production.local is ready for production.');
} else if (allPresent) {
  console.log('\n⚠️  WARNING: All variables are present, but some have placeholder values.');
  console.log('   Update the placeholder values before deploying to production.');
} else {
  console.log('\n❌ ERROR: Some required variables are missing!');
  console.log('   Please add the missing variables to .env.production.local');
  process.exit(1);
}

console.log('');

