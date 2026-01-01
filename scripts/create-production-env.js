/**
 * Script to create .env.production.local file
 * Run: node scripts/create-production-env.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env.production.local');

// Generate random secrets
const generateSecret = () => crypto.randomBytes(32).toString('hex');

const jwtSecret = generateSecret();
const nextAuthSecret = generateSecret();
const hmacSecret = generateSecret();

const envContent = `# Production Environment Variables
# This file is for production deployment only
# Generated: ${new Date().toISOString()}
# Make sure this file is in .gitignore (it should be by default)

# ============================================
# DATABASE CONFIGURATION
# ============================================
# Replace YOUR_VPS_IP with your actual database server IP or hostname
DATABASE_URL="postgresql://admin:your_secure_password@YOUR_VPS_IP:5432/adminnagent?sslmode=require"

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
# Auto-generated secrets (change if needed)
JWT_SECRET="${jwtSecret}"
NEXTAUTH_SECRET="${nextAuthSecret}"
HMAC_SECRET="${hmacSecret}"

# ============================================
# APPLICATION CONFIGURATION
# ============================================
# Replace with your actual production domain
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
NODE_ENV="production"
PORT="3000"
CLIENT_URL="https://yourdomain.com"

# ============================================
# EMAIL CONFIGURATION (Amazon SES)
# ============================================
# ⚠️ IMPORTANT: Change these credentials - the hardcoded ones in code are exposed!
MAIL_HOST="email-smtp.ap-south-1.amazonaws.com"
MAIL_PORT="465"
MAIL_ENCRYPTION="ssl"
MAIL_USERNAME="YOUR_AWS_SES_SMTP_USERNAME"
MAIL_PASSWORD="YOUR_AWS_SES_SMTP_PASSWORD"
MAIL_FROM_ADDRESS="no-reply@yourdomain.com"
MAIL_FROM_NAME="Your Support Desk"
MAIL_REPLY_TO="support@yourdomain.com"
MAIL_DEBUG="false"

# ============================================
# GOOGLE OAUTH (Optional)
# ============================================
# Only needed if NOT configuring via Admin UI (Settings → Integrations)
# If you configure via Admin UI, these are NOT required
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ============================================
# AI API KEYS (Optional)
# ============================================
# Only needed if NOT configuring via Admin UI (Settings → AI)
# If you configure via Admin UI, these are NOT required
OPENAI_API_KEY="sk-your-openai-api-key-here"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key-here"
`;

// Check if file already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.production.local already exists!');
  console.log('   Delete it first if you want to regenerate it.');
  process.exit(1);
}

// Write the file
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Created .env.production.local');
console.log('');
console.log('📝 Next steps:');
console.log('   1. Edit .env.production.local and replace placeholder values:');
console.log('      - DATABASE_URL: Replace YOUR_VPS_IP with your database host');
console.log('      - NEXT_PUBLIC_BASE_URL: Replace with your production domain');
console.log('      - MAIL_USERNAME / MAIL_PASSWORD: Add your AWS SES credentials');
console.log('      - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: Add if not using Admin UI');
console.log('      - OPENAI_API_KEY / ANTHROPIC_API_KEY: Add if not using Admin UI');
console.log('');
console.log('   2. Secrets (JWT_SECRET, NEXTAUTH_SECRET, HMAC_SECRET) are auto-generated');
console.log('      You can regenerate them if needed.');
console.log('');
console.log('   3. Make sure .env.production.local is in .gitignore (already added)');
console.log('');

