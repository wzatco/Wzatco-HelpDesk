# Hostinger Deployment - 500 Error Fix Guide

**Date:** January 1, 2026  
**Issue:** API endpoints returning 500 errors on production  
**Root Cause:** Database connection not configured

---

## 🐛 Errors Detected

```
/api/public/knowledge-base/articles: 500 (Internal Server Error)
/api/public/knowledge-base/categories: 500 (Internal Server Error)
```

**Cause:** Missing or incorrect `DATABASE_URL` environment variable

---

## ✅ Solution: Configure Environment Variables on Hostinger

### Step 1: Access Hostinger Environment Variables

1. **Login to Hostinger Control Panel**
   - Go to: https://hpanel.hostinger.com
   
2. **Navigate to Your Application**
   - Click: **Hosting** → Your Website → **Manage**
   
3. **Open Environment Variables**
   - Option A: **Node.js Application** → **Environment Variables**
   - Option B: **Advanced** → **Environment Variables**
   - Option C: **Settings** → **Application Settings** → **Environment Variables**

### Step 2: Add Required Environment Variables

Add these **CRITICAL** variables:

```bash
# Database Connection (REQUIRED)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Next.js Configuration
NODE_ENV="production"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Email Configuration (if using email features)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@your-domain.com"

# Socket.IO Configuration
CLIENT_URL="https://your-domain.com"

# Optional: AI Features
OPENAI_API_KEY="your-openai-key"
```

### Step 3: Get Your Database URL

#### If Using Neon (Recommended):

1. Go to: https://console.neon.tech
2. Select your project
3. Click: **Connection Details**
4. Copy the **Connection String**
5. Format:
   ```
   postgresql://username:password@ep-xxx-xxx.region.neon.tech/neondb?sslmode=require
   ```

#### If Using Hostinger MySQL:

1. In Hostinger Panel: **Databases** → Your Database
2. Note down:
   - Host: `localhost` or provided hostname
   - Port: `3306`
   - Database name
   - Username
   - Password
3. Format (for PostgreSQL adapter):
   ```
   postgresql://username:password@host:5432/database
   ```

### Step 4: Restart Application

After adding environment variables:

1. In Hostinger Panel: **Node.js Application**
2. Click: **Restart Application** button
3. Wait 30 seconds for restart to complete

---

## 🔍 Verify Fix

### Method 1: Test API Endpoints

Open your browser and visit:

```
https://your-domain.com/api/server-status
```

**Expected Response:**
```json
{
  "status": "running",
  "environment": "production",
  "socketIO": "initialized"
}
```

### Method 2: Test Knowledge Base API

Visit:
```
https://your-domain.com/api/public/knowledge-base/categories
```

**Expected Response:**
```json
{
  "success": true,
  "categories": [...]
}
```

**If you still get 500:**
- ❌ `DATABASE_URL` is wrong or missing
- ❌ Database is not accessible
- ❌ Environment variables not loaded

### Method 3: Check Homepage

Visit:
```
https://your-domain.com
```

**Should load without errors**

---

## 📊 Environment Variables Checklist

- [ ] `DATABASE_URL` - Database connection string
- [ ] `NODE_ENV` - Set to "production"
- [ ] `NEXTAUTH_URL` - Your domain URL
- [ ] `NEXTAUTH_SECRET` - Random secret string
- [ ] `SMTP_*` - Email configuration (if needed)
- [ ] `CLIENT_URL` - Your domain URL (for CORS)

---

## 🐛 Common Issues & Solutions

### Issue 1: "DATABASE_URL is not defined"

**Solution:**
```bash
# In Hostinger Environment Variables, add:
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### Issue 2: "Connection refused"

**Cause:** Database host/port is wrong

**Solution:**
- Verify database hostname
- Check if database allows external connections
- Ensure port is correct (5432 for PostgreSQL, 3306 for MySQL)

### Issue 3: "SSL connection required"

**Solution:**
```bash
# Add ?sslmode=require to DATABASE_URL:
DATABASE_URL=postgresql://...?sslmode=require
```

### Issue 4: Environment variables not loading

**Solution:**
1. Restart Node.js application in Hostinger
2. Clear Hostinger cache (if available)
3. Re-deploy from GitHub (trigger rebuild)

---

## 🚀 Quick Fix Commands

### If using Git to trigger rebuild:

```bash
# Make a small change to force rebuild
git commit --allow-empty -m "Trigger rebuild with env vars"
git push origin main
```

This will:
1. Trigger Hostinger auto-deploy
2. Reload environment variables
3. Restart the application

---

## 📝 Sample DATABASE_URL Formats

### Neon (PostgreSQL):
```
postgresql://neondb_owner:password@ep-xxx-xxx.region.neon.tech/neondb?sslmode=require
```

### Hostinger PostgreSQL:
```
postgresql://u123456_db:password@localhost:5432/u123456_database
```

### External PostgreSQL:
```
postgresql://username:password@db.example.com:5432/dbname?sslmode=require
```

---

## ✅ Success Indicators

After fixing environment variables:

1. **Homepage loads:** ✅
2. **API returns data:** ✅ (not 500 errors)
3. **No console errors:** ✅
4. **Server status endpoint works:** ✅

---

## 📞 Still Getting 500 Errors?

### Check Hostinger Logs

1. Hostinger Panel → Logs
2. Look for error messages:
   ```
   Error: DATABASE_URL is not defined
   Error: connect ECONNREFUSED
   Error: password authentication failed
   ```

### Check Server Status

Visit: `https://your-domain.com/api/server-status`

This will show if the server is running and what environment it detects.

### Contact Support

If DATABASE_URL is set correctly but still getting errors:

**What to tell Hostinger Support:**
```
My Next.js application is deployed but getting 500 errors on API routes.
I've set DATABASE_URL in environment variables and restarted the app.
Error: "Internal server error" on /api/public/knowledge-base/* routes
Can you verify:
1. Environment variables are loaded?
2. Database connection is allowed?
3. Node.js application is running?
```

---

## 🎯 Expected Behavior After Fix

### Before (Current State):
- ❌ 500 errors on API routes
- ❌ Knowledge base not loading
- ❌ Database connection failed

### After (Fixed State):
- ✅ API routes return 200 OK
- ✅ Knowledge base loads data
- ✅ Database connected successfully
- ✅ No console errors

---

**End of Fix Guide**

