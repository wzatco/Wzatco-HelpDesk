# Environment Files Explanation

## Which .env File is Used for `npm run dev`?

When you run `npm run dev`, Next.js automatically loads environment variables from multiple `.env` files in a **specific priority order**.

### Loading Order (Highest to Lowest Priority)

Next.js loads environment variables in this order:

1. **`.env.development.local`** (Highest Priority)
   - Loaded only in development mode
   - Ignored by git (in `.gitignore`)
   - Use for: Local development overrides that should never be committed

2. **`.env.local`** 
   - Loaded in all environments (dev, production, etc.)
   - Ignored by git (in `.gitignore`)
   - Use for: Local secrets and overrides

3. **`.env.development`**
   - Loaded only in development mode
   - Committed to git (not in `.gitignore`)
   - Use for: Shared development defaults

4. **`.env`** (Lowest Priority)
   - Loaded in all environments
   - Committed to git (not in `.gitignore`)
   - Use for: Default values and non-sensitive config

### How It Works

- **Variables in files loaded later override variables in files loaded earlier**
- **`.env.development.local` has the highest priority** - it will override everything
- **`.env` has the lowest priority** - it gets overridden by all other files

### Example

If you have:

**`.env`**:
```bash
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="default-secret"
```

**`.env.local`**:
```bash
JWT_SECRET="my-local-secret"
```

**`.env.development.local`**:
```bash
DATABASE_URL="postgresql://localhost:5432/mydb"
```

**Result when running `npm run dev`:**
- `DATABASE_URL` = `"postgresql://localhost:5432/mydb"` (from `.env.development.local`)
- `JWT_SECRET` = `"my-local-secret"` (from `.env.local`, overrides `.env`)

---

## Current Project Setup

Based on your `.gitignore`, you have:
- ✅ `.env.local` (ignored by git)
- ✅ `.env` (also ignored by git - both are in `.gitignore`)

**Note:** In your project, both `.env` and `.env.local` are ignored by git. This means you need to create these files locally.

### Recommended Setup

**For Local Development:**

1. **`.env`** (committed to git) - Default values:
   ```bash
   DATABASE_URL="file:./prisma/dev.db"
   NODE_ENV="development"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   ```

2. **`.env.local`** (NOT committed) - Your local secrets:
   ```bash
   JWT_SECRET="your-local-jwt-secret"
   NEXTAUTH_SECRET="your-local-nextauth-secret"
   MAIL_USERNAME="your-email-username"
   MAIL_PASSWORD="your-email-password"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. **`.env.development.local`** (optional, NOT committed) - Development overrides:
   ```bash
   # Override database for testing
   DATABASE_URL="postgresql://localhost:5432/testdb"
   ```

---

## Quick Reference

| File | Loaded In | Git Ignored | Priority | Use For |
|------|-----------|-------------|----------|---------|
| `.env.development.local` | Development only | ✅ Yes | Highest | Local dev overrides |
| `.env.local` | All environments | ✅ Yes | High | Local secrets |
| `.env.development` | Development only | ❌ No | Medium | Shared dev config |
| `.env` | All environments | ⚠️ Varies | Lowest | Default values |

**Note:** In your project, `.env` is also in `.gitignore`, so it's not committed to git.

---

## Best Practices

1. **Never commit secrets** - Use `.env.local` or `.env.development.local`
2. **Use `.env` for defaults** - Non-sensitive defaults that everyone needs
3. **Use `.env.local` for secrets** - Your personal API keys, passwords, etc.
4. **Use `.env.development.local`** - If you need to override dev-specific settings locally

---

## Checking Which File is Being Used

To see which environment variables are loaded, you can add this to your code temporarily:

```javascript
// In any API route or page
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
```

Or check in your terminal:
```bash
# See all loaded env vars (be careful - may contain secrets)
node -e "console.log(process.env)"
```

---

**Note:** When you run `npm run dev`, Next.js automatically sets `NODE_ENV=development`, which triggers loading of `.env.development.local` and `.env.development` files.

---

## 🚀 Production: Which Single .env File to Use?

**If you can only use ONE .env file for production, use:**

### ✅ `.env.production.local`

**Why this file?**
- ✅ **Highest priority** - Overrides all other .env files in production
- ✅ **Production-specific** - Only loaded when `NODE_ENV=production`
- ✅ **Ignored by git** - Safe for secrets (should be in `.gitignore`)
- ✅ **Single source of truth** - All production variables in one place

**How to use it:**
1. Create `.env.production.local` in your project root
2. Add all production environment variables (see `PRODUCTION_ENV_VARIABLES.md` for complete list)
3. Make sure it's in `.gitignore` (it should be by default)
4. Deploy this file to your server (or use hosting dashboard)

**Example `.env.production.local`:**
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# Authentication
JWT_SECRET="your-production-jwt-secret"
NEXTAUTH_SECRET="your-production-nextauth-secret"
HMAC_SECRET="your-production-hmac-secret"

# Application
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
NODE_ENV="production"
PORT="3000"
CLIENT_URL="https://yourdomain.com"

# Email
MAIL_HOST="email-smtp.ap-south-1.amazonaws.com"
MAIL_PORT="465"
MAIL_ENCRYPTION="ssl"
MAIL_USERNAME="your-smtp-username"
MAIL_PASSWORD="your-smtp-password"
MAIL_FROM_ADDRESS="no-reply@yourdomain.com"
MAIL_FROM_NAME="Your Support Desk"
MAIL_REPLY_TO="support@yourdomain.com"
MAIL_DEBUG="false"

# Optional (if not using Admin UI)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OPENAI_API_KEY="sk-your-openai-key"
```

---

## ⚠️ Better Alternative: Hosting Dashboard

**For production, the BEST practice is to NOT use .env files at all:**

### Use Your Hosting Platform's Environment Variables Dashboard

**Why?**
- ✅ **More secure** - Variables stored in platform, not in files
- ✅ **Easier management** - Update without redeploying
- ✅ **No file conflicts** - No need to manage .env files
- ✅ **Better for CI/CD** - Variables set per environment

**How to set up:**

#### **Vercel:**
1. Go to: **Project → Settings → Environment Variables**
2. Add each variable:
   - Name: `DATABASE_URL`
   - Value: `postgresql://...`
   - Environments: ✅ Production
3. Click **Save**

#### **Railway / Render / Other Platforms:**
1. Go to: **Project → Environment Variables**
2. Add variables in the dashboard
3. Save and redeploy

**This is the recommended approach!** Use `.env.production.local` only if your hosting platform doesn't support environment variables in the dashboard.

---

## 📋 Production Loading Order

When `NODE_ENV=production`, Next.js loads files in this order:

1. **`.env.production.local`** (Highest Priority) ✅ **Use this one!**
2. **`.env.local`**
3. **`.env.production`**
4. **`.env`** (Lowest Priority)

**Recommendation:** Use `.env.production.local` for production secrets, or better yet, use your hosting platform's environment variables dashboard.

