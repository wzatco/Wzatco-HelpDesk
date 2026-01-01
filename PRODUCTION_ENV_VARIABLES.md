# Production Environment Variables

**Generated:** January 2025  
**Purpose:** Complete list of environment variables required for production deployment

---

## 🔐 Required Environment Variables

### Database Configuration

```bash
# Database Connection String
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
# Replace YOUR_VPS_IP with your actual database server IP or hostname
DATABASE_URL="postgresql://admin:your_secure_password@YOUR_VPS_IP:5432/adminnagent?sslmode=require"
```

**Note:** Your current schema uses SQLite (`file:./dev.db`). For production, you should:
1. Migrate to PostgreSQL (recommended) or MySQL
2. Update `prisma/schema.prisma` datasource to:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run `npx prisma migrate deploy` to apply migrations

---

### Authentication & Security

```bash
# JWT Secret for token signing (used across multiple services)
# Generate a strong random 32-character string
JWT_SECRET="e5b2b9050c0fda32c3240cb518a9f12ffec065e51d1f987a8619984372d383d2"

# NextAuth Secret for session management
# Generate a strong random 32-character string
NEXTAUTH_SECRET="e5b2b9050c0fda32c3240cb518a9f12ffec065e51d1f987a8619984372d383d2"

# HMAC Secret for API key encryption (optional, falls back to JWT_SECRET)
HMAC_SECRET="e5b2b9050c0fda32c3240cb518a9f12ffec065e51d1f987a8619984372d383d2"
```

**⚠️ SECURITY WARNING:** 
- Generate **unique** secrets for each environment (development, staging, production)
- Never commit these values to version control
- Use different secrets for JWT_SECRET and NEXTAUTH_SECRET in production

---

### Application URL

```bash
# Base URL of your application (used for email links, callbacks, etc.)
# Replace with your actual production domain
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
```

**Examples:**
- Production: `https://support.yourcompany.com`
- Staging: `https://staging.yourcompany.com`

---

### Email Configuration (Amazon SES)

```bash
# SMTP Host (Amazon SES endpoint)
MAIL_HOST="email-smtp.ap-south-1.amazonaws.com"

# SMTP Port (465 for SSL, 587 for TLS)
MAIL_PORT="465"

# Encryption type (ssl or tls)
MAIL_ENCRYPTION="ssl"

# SMTP Username (AWS SES SMTP username)
MAIL_USERNAME="AKIA6ORTJ2B2BIIEBXP4"

# SMTP Password (AWS SES SMTP password)
MAIL_PASSWORD="BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66"

# From Email Address
MAIL_FROM_ADDRESS="no-reply@wzatco.com"

# From Name
MAIL_FROM_NAME="Wzatco Support Desk"

# Reply-To Address
MAIL_REPLY_TO="support@wzatco.com"

# Debug mode (true/false)
MAIL_DEBUG="false"
```

**⚠️ IMPORTANT:** 
- The hardcoded credentials in `lib/email/config.js` are **exposed in your codebase**
- **CHANGE THESE IMMEDIATELY** in production
- Use environment variables instead
- These credentials appear to be AWS SES credentials - ensure they're valid and have proper IAM permissions

---

### Google OAuth (Optional - for Widget Authentication)

**⚠️ IMPORTANT:** Google OAuth credentials can be configured in **TWO ways**:

#### Option 1: Via Admin UI (Recommended)
1. Log in to Admin Dashboard
2. Go to **Settings → Integrations**
3. Enter your Google Client ID and Client Secret
4. Enable "Google Auth Enabled" toggle
5. Credentials are stored securely in the database

**No environment variables needed** if using this method.

#### Option 2: Via Environment Variables (Fallback)
```bash
# Google OAuth Client ID
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Google OAuth Client Secret
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Priority Order:**
1. **Database (Admin UI)** - Checked first ✅
2. **Environment Variables** - Used as fallback if not in database

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/widget-callback`
4. Either:
   - Enter credentials in Admin UI (Settings → Integrations), OR
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables

---

### AI/OpenAI Configuration (Optional)

**⚠️ IMPORTANT:** AI API keys can be configured in **TWO ways**:

#### Option 1: Via Admin UI (Recommended)
1. Log in to Admin Dashboard
2. Go to **Settings → AI** (or **Settings → Integrations**)
3. Enter your OpenAI or Anthropic API key
4. Select AI provider (OpenAI or Gemini)
5. Enable "AI Enabled" toggle
6. Keys are stored **encrypted** in the database

**No environment variables needed** if using this method.

#### Option 2: Via Environment Variables (Fallback)
```bash
# OpenAI API Key (for AI chat features)
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Anthropic API Key (alternative to OpenAI)
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key-here"
```

**Priority Order:**
1. **Database (Admin UI)** - Checked first ✅
2. **Environment Variables** - Used as fallback if not in database

**Setup Instructions:**
- OpenAI: Get key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Anthropic: Get key from [console.anthropic.com](https://console.anthropic.com/)
- Either:
  - Enter API key in Admin UI (Settings → AI), OR
  - Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variables

---

### Node Environment & Server

```bash
# Environment mode
NODE_ENV="production"

# Server Port (default: 3000)
PORT="3000"

# Client URL for Socket.IO CORS (if using custom server.js)
# Should match your NEXT_PUBLIC_BASE_URL
CLIENT_URL="https://yourdomain.com"
```

---

## 📋 Complete Environment Variables List

Copy-paste ready format:

```bash
# Database
DATABASE_URL="postgresql://admin:your_secure_password@YOUR_VPS_IP:5432/adminnagent?sslmode=require"

# Authentication
JWT_SECRET="e5b2b9050c0fda32c3240cb518a9f12ffec065e51d1f987a8619984372d383d2"
NEXTAUTH_SECRET="e5b2b9050c0fda32c3240cb518a9f12ffec065e51d1f987a8619984372d383d2"
HMAC_SECRET="e5b2b9050c0fda32c3240cb518a9f12ffec065e51d1f987a8619984372d383d2"

# Application
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
NODE_ENV="production"
PORT="3000"
CLIENT_URL="https://yourdomain.com"

# Email (Amazon SES)
MAIL_HOST="email-smtp.ap-south-1.amazonaws.com"
MAIL_PORT="465"
MAIL_ENCRYPTION="ssl"
MAIL_USERNAME="AKIA6ORTJ2B2BIIEBXP4"
MAIL_PASSWORD="BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66"
MAIL_FROM_ADDRESS="no-reply@wzatco.com"
MAIL_FROM_NAME="Wzatco Support Desk"
MAIL_REPLY_TO="support@wzatco.com"
MAIL_DEBUG="false"

# Google OAuth (Optional - Only needed if NOT configuring via Admin UI)
# If you configure via Admin Settings → Integrations, these are NOT required
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI APIs (Optional - Only needed if NOT configuring via Admin UI)
# If you configure via Admin Settings → AI, these are NOT required
OPENAI_API_KEY="sk-your-openai-api-key-here"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key-here"
```

---

## 🔍 Variable Usage Summary

### Configuration Priority (Google OAuth & AI Keys)

**For Google OAuth and AI API Keys, the system checks in this order:**

1. **Database (Admin UI)** - ✅ **Primary Method**
   - Configure via: `Admin Dashboard → Settings → Integrations`
   - For AI: `Admin Dashboard → Settings → AI`
   - Credentials stored in database (AI keys are encrypted)
   - **Recommended:** Use this method for easier management

2. **Environment Variables** - ⚠️ **Fallback Only**
   - Only used if credentials are NOT found in database
   - Useful for initial setup or if database is unavailable
   - Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, etc.

**Recommendation:** 
- Use **Admin UI** for Google OAuth and AI keys (no env vars needed)
- Use **Environment Variables** only if you prefer infrastructure-as-code approach

---

### Critical (Required for Basic Functionality)
- ✅ `DATABASE_URL` - Database connection
- ✅ `JWT_SECRET` - Authentication tokens
- ✅ `NEXTAUTH_SECRET` - NextAuth sessions
- ✅ `NEXT_PUBLIC_BASE_URL` - Application base URL

### Important (Required for Email Features)
- ✅ `MAIL_HOST` - SMTP server
- ✅ `MAIL_PORT` - SMTP port
- ✅ `MAIL_USERNAME` - SMTP username
- ✅ `MAIL_PASSWORD` - SMTP password
- ✅ `MAIL_FROM_ADDRESS` - Sender email
- ✅ `MAIL_FROM_NAME` - Sender name

### Optional (Feature-Specific)
- ⚠️ `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Widget Google login (optional if configured via Admin UI)
- ⚠️ `OPENAI_API_KEY` - AI chat features (optional if configured via Admin UI)
- ⚠️ `ANTHROPIC_API_KEY` - Alternative AI provider (optional if configured via Admin UI)
- ⚠️ `HMAC_SECRET` - API key encryption (falls back to JWT_SECRET)

---

## ⚠️ Security Recommendations

1. **Generate Unique Secrets:**
   ```bash
   # Generate secure random strings
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Rotate Exposed Credentials:**
   - The AWS SES credentials in `lib/email/config.js` are **hardcoded and exposed**
   - **IMMEDIATELY** rotate these credentials in AWS IAM
   - Use environment variables instead

3. **Database Security:**
   - Use strong database passwords
   - Enable SSL/TLS for database connections
   - Restrict database access to application server IP only

4. **Environment Separation:**
   - Use different credentials for development, staging, and production
   - Never use production credentials in development

---

## 📝 Deployment Checklist

- [ ] Update `prisma/schema.prisma` datasource to PostgreSQL
- [ ] Set up PostgreSQL database on your VPS
- [ ] Generate unique secrets for JWT_SECRET and NEXTAUTH_SECRET
- [ ] Configure all environment variables in hosting dashboard
- [ ] Rotate AWS SES credentials (currently hardcoded)
- [ ] Update NEXT_PUBLIC_BASE_URL with production domain
- [ ] Configure Google OAuth redirect URIs (if using)
- [ ] Test email sending functionality
- [ ] Test authentication flows
- [ ] Run `npx prisma migrate deploy` to apply database migrations
- [ ] Run `npx prisma generate` to regenerate Prisma client

---

**End of Environment Variables List**

