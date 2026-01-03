# Hostinger Cloud Deployment Guide

## 🚨 **CRITICAL: Custom Server Required**

This application **requires** a custom Node.js server (`server.js`) to run Socket.IO for real-time features.

**DO NOT** use the default `next start` command - it will cause Socket.IO endpoints to return 404 errors.

---

## ✅ **Correct Start Commands** (Choose One)

### **Option 1: Direct Node Execution (Recommended)**
```bash
node server.js
```

### **Option 2: NPM Script**
```bash
npm start
```
*(This runs `node server.js` as defined in package.json)*

### **Option 3: Bash Script**
```bash
bash start.sh
```

---

## 🔧 **Hostinger Configuration Steps**

### **1. Build Command**
Set in Hostinger Dashboard → Build Settings:
```bash
npm install && npm run build
```

### **2. Start Command**
Set in Hostinger Dashboard → Advanced Settings → Start Command:
```bash
node server.js
```

**⚠️ CRITICAL:** If Hostinger auto-detects as a Next.js app and uses `next start`, you **MUST** override this in the dashboard settings.

---

## 🌐 **Environment Variables Required**

Ensure these are set in Hostinger's Environment Variables section:

```bash
# Database
DATABASE_URL="your_postgresql_connection_string"

# NextAuth
NEXTAUTH_URL="https://blue-albatross-554679.hostingersite.com"
NEXTAUTH_SECRET="your_secret_here"
JWT_SECRET="your_jwt_secret_here"

# Google OAuth
GOOGLE_CLIENT_ID="your_client_id"
GOOGLE_CLIENT_SECRET="your_client_secret"

# Application URLs
NEXT_PUBLIC_BASE_URL="https://blue-albatross-554679.hostingersite.com"
CLIENT_URL="https://blue-albatross-554679.hostingersite.com"

# OpenAI (Optional)
OPENAI_API_KEY="your_openai_key"

# Email (Optional)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="your_email"
EMAIL_PASS="your_password"

# Runtime
NODE_ENV="production"
```

---

## 🔍 **Verifying Socket.IO is Running**

After deployment, check the application logs. You should see:

```
✅ Server Ready on http://0.0.0.0:8080
✅ Socket.IO initialized on /api/widget/socket
✅ Environment: PRODUCTION
```

**If you see this instead, the custom server is NOT running:**
```
ready - started server on 0.0.0.0:3000
```

---

## 🛠️ **Troubleshooting**

### **Socket.IO Returns 404 Errors**

**Symptoms:**
- Browser console shows: `404 Not Found` for `/api/widget/socket/?EIO=4&transport=polling`
- Widget chat doesn't connect

**Cause:** Hostinger is using `next start` instead of `node server.js`

**Solution:**
1. Open Hostinger Dashboard
2. Navigate to your application settings
3. Find "Start Command" or "Custom Start Script"
4. Set it to: `node server.js`
5. Redeploy the application

---

## 📞 **Support**

If you cannot find the "Start Command" setting in Hostinger:

**Contact Hostinger Support:**
> "My Next.js application requires a custom server (server.js) to run Socket.IO. How do I configure the start command to run `node server.js` instead of the default `next start`?"

---

## 🔗 **Files Changed for Hostinger Compatibility**

- `package.json` - Added `"main": "server.js"` to enforce custom entry point
- `Procfile` - Added Heroku-style process definition
- `.hostingerrc` - Custom Hostinger configuration (if supported)
- `start.sh` - Bash wrapper script for maximum compatibility
- `server.js` - Production-ready custom server with Socket.IO

---

## ✅ **Verification Checklist**

Before contacting support, verify:

- [ ] `npm run build` completes successfully locally
- [ ] `.next` directory exists after build
- [ ] `server.js` exists in project root
- [ ] `package.json` has `"main": "server.js"`
- [ ] `package.json` has `"start": "node server.js"`
- [ ] All environment variables are set in Hostinger dashboard
- [ ] Database is accessible from Hostinger's IP range

---

Last Updated: January 3, 2026

