# 🚀 Hostinger Cloud Hosting - Complete Deployment Guide

**Date:** January 1, 2026  
**Application:** AdminNAgent Helpdesk System  
**Repository:** https://github.com/wzatco/Wzatco-HelpDesk.git  
**Target URL:** https://darkslateblue-quail-683975.hostingersite.com

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Hostinger Requirements](#hostinger-requirements)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Environment Variables Setup](#environment-variables-setup)
5. [Build Configuration](#build-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Post-Deployment Testing](#post-deployment-testing)

---

## ✅ Pre-Deployment Checklist

### Repository Status
- [x] Code pushed to GitHub (clean repository)
- [x] Latest commit: "Fresh push: Complete AdminNAgent helpdesk system"
- [x] Remote: https://github.com/wzatco/Wzatco-HelpDesk.git
- [x] Branch: `main`

### Application Readiness
- [x] `package.json` configured with production scripts
- [x] `server.js` supports Hostinger PORT environment variable
- [x] Database migrated to MySQL (no SQLite dependencies)
- [x] Prisma schema configured for MySQL
- [x] Environment variables documented

### Database
- [x] MySQL database active
- [x] Host: `82.180.140.4:3306`
- [x] Database: `u394742293_HD_demo`
- [x] Remote connections enabled
- [x] Data populated (24 tickets, 9 agents, etc.)

---

## 🖥️ Hostinger Requirements

### Critical Requirements

| Requirement | Details | Status |
|------------|---------|--------|
| **Hosting Type** | Node.js Cloud Hosting (NOT PHP!) | ⚠️ Verify |
| **Node.js Version** | v18.17+ (v20+ recommended) | ⚠️ Verify |
| **Memory** | Minimum 512MB RAM (1GB+ recommended) | ⚠️ Verify |
| **Database** | MySQL 5.7+ or 8.0+ (✅ Already configured) | ✅ Ready |
| **Environment Variables** | Support for custom env vars | ⚠️ Verify |
| **WebSocket Support** | For Socket.IO real-time features | ⚠️ Verify |

### ⚠️ IMPORTANT: This is NOT a PHP Application!

```
❌ PHP Hosting → Will NOT work
❌ WordPress Hosting → Will NOT work
❌ Static Site Hosting → Will NOT work

✅ Node.js Cloud Hosting → Required!
✅ VPS with Node.js → Will work
✅ Cloud Hosting with Node.js → Will work
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Access Hostinger Dashboard

1. Log in to **Hostinger** at: https://hpanel.hostinger.com
2. Navigate to your website/application
3. Verify you're on a **Node.js compatible plan**

### Step 2: Create/Configure Node.js Application

#### Option A: If Hostinger has "Node.js Application" Section

1. Go to **Dashboard** → **Node.js Applications** (or similar)
2. Click **"Create Application"** or **"Add New"**
3. Configure:

```yaml
Application Name: AdminNAgent Helpdesk
Repository URL: https://github.com/wzatco/Wzatco-HelpDesk.git
Branch: main
Node.js Version: 20.x (or 18.17+)
Entry Point: server.js
Root Directory: / (leave empty or /)
```

#### Option B: If Hostinger uses Git Integration

1. Go to **Git** → **Create Application**
2. Connect your GitHub repository
3. Authorize Hostinger to access the repository
4. Select repository: `wzatco/Wzatco-HelpDesk`
5. Select branch: `main`

### Step 3: Configure Build Settings

Set the following commands:

```yaml
Install Command: npm install
Build Command: npm run build
Start Command: npm start
Port: (Leave empty - will use Hostinger's auto-assigned PORT)
```

**Explanation:**
- `npm install` → Installs dependencies + runs `prisma generate` (via postinstall)
- `npm run build` → Runs `prisma generate && next build`
- `npm start` → Runs `node server.js` (production mode)

### Step 4: Set Environment Variables

Go to **Environment Variables** section and add these **14 variables**:

#### 🔴 Critical Variables (Required)

| Variable Name | Value |
|--------------|-------|
| `DATABASE_URL` | `mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo` |
| `JWT_SECRET` | `f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453` |
| `NEXTAUTH_SECRET` | `f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453` |
| `NEXT_PUBLIC_BASE_URL` | `https://darkslateblue-quail-683975.hostingersite.com` |
| `NODE_ENV` | `production` |

#### 🟡 Email Variables (Required for Email Features)

| Variable Name | Value |
|--------------|-------|
| `MAIL_HOST` | `email-smtp.ap-south-1.amazonaws.com` |
| `MAIL_PORT` | `465` |
| `MAIL_ENCRYPTION` | `ssl` |
| `MAIL_USERNAME` | `AKIA6ORTJ2B2BIIEBXP4` |
| `MAIL_PASSWORD` | `BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66` |
| `MAIL_FROM_ADDRESS` | `no-reply@wzatco.com` |
| `MAIL_FROM_NAME` | `Wzatco Support Desk` |
| `MAIL_REPLY_TO` | `support@wzatco.com` |
| `MAIL_DEBUG` | `false` |

**How to Add:**
1. Click **"+ Add Variable"** or **"Add New"**
2. Enter **Name** (exact spelling, case-sensitive!)
3. Enter **Value** (copy-paste from table above)
4. Click **"Save"** or **"Add"**
5. Repeat for all 14 variables

### Step 5: Deploy the Application

1. After adding all environment variables, click **"Deploy"** or **"Build & Deploy"**
2. Wait for the build process to complete (3-5 minutes)
3. Monitor the build logs for any errors

**Expected Build Output:**
```
> npm install
  ✓ Installing dependencies...
  ✓ Running postinstall: prisma generate

> npm run build
  ✓ Prisma Client generated
  ✓ Next.js build starting...
  ✓ Compiled successfully
  ✓ Build completed

> npm start
  ✅ Server Ready on http://0.0.0.0:3000
  ✅ Socket.IO initialized
```

---

## 🔧 Build Configuration Details

### package.json Scripts (Already Configured)

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "start": "node server.js",
    "postinstall": "prisma generate"
  }
}
```

### server.js Port Binding (Already Configured)

```javascript
// Automatically detects Hostinger's PORT environment variable
const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0'; // Binds to all interfaces
```

Your `server.js` is **already configured** for Hostinger Cloud Hosting!

---

## 🔍 Troubleshooting

### Issue 1: "Cannot connect to database"

**Symptoms:**
- Error: `ECONNREFUSED`
- Error: `Access denied for user`

**Solutions:**
1. ✅ Verify `DATABASE_URL` is copied exactly (no spaces, no line breaks)
2. ✅ Check MySQL database is accessible from Hostinger IP
3. ✅ Test connection using Hostinger's SSH (if available):
   ```bash
   mysql -h 82.180.140.4 -u u394742293_HD_demo -p
   # Enter password: Rohan_1025
   ```

### Issue 2: "Build failed: Prisma Client not generated"

**Symptoms:**
- Error: `@prisma/client did not initialize yet`
- Error: `Cannot find module '@prisma/client'`

**Solutions:**
1. ✅ Ensure `postinstall` script runs: `"postinstall": "prisma generate"`
2. ✅ Check build logs - should see "Prisma Client generated"
3. ✅ Manually trigger: Add to build command: `npm run build`

### Issue 3: "Port already in use" or "EADDRINUSE"

**Symptoms:**
- Error: `listen EADDRINUSE: address already in use`

**Solutions:**
1. ✅ Don't hardcode port in `server.js` (already using `process.env.PORT`)
2. ✅ Let Hostinger assign the port automatically
3. ✅ Restart the application

### Issue 4: "Environment variable not found"

**Symptoms:**
- Error: `JWT_SECRET is not defined`
- Error: `DATABASE_URL is required`

**Solutions:**
1. ✅ Verify all 14 variables are added in Hostinger dashboard
2. ✅ Check for typos (variable names are case-sensitive!)
3. ✅ Redeploy after adding variables

### Issue 5: "Next.js build too large" or "Out of memory"

**Symptoms:**
- Build crashes during `next build`
- Error: `JavaScript heap out of memory`

**Solutions:**
1. ✅ Check your plan has sufficient memory (minimum 512MB)
2. ✅ Upgrade to higher tier plan if needed
3. ✅ Contact Hostinger support to increase memory limit

### Issue 6: "WebSocket connection failed" (Socket.IO)

**Symptoms:**
- Real-time features not working
- Chat messages don't appear instantly

**Solutions:**
1. ✅ Verify Hostinger supports WebSocket connections
2. ✅ Check if proxy/firewall blocks WebSocket
3. ✅ Socket.IO will fallback to polling (slower but works)

### Issue 7: "Module not found" or "Cannot find module"

**Symptoms:**
- Error: `Cannot find module 'better-sqlite3'` (you won't see this - already removed!)
- Error: `Cannot find module 'xyz'`

**Solutions:**
1. ✅ Ensure `npm install` completed successfully
2. ✅ Check `node_modules` directory exists
3. ✅ Verify `package-lock.json` is committed to Git

---

## ✅ Post-Deployment Testing

### Test 1: Homepage Loads

1. Visit: `https://darkslateblue-quail-683975.hostingersite.com`
2. **Expected:** Widget interface appears
3. **Expected:** No 500 errors, no blank page

### Test 2: Admin Login

1. Visit: `https://darkslateblue-quail-683975.hostingersite.com/admin/login`
2. Login with your admin credentials
3. **Expected:** Dashboard loads with metrics

### Test 3: Database Connection

1. After logging in, check if data appears:
   - Tickets count
   - Agents list
   - Departments
2. **Expected:** All existing data visible (24 tickets, 9 agents, etc.)

### Test 4: Real-Time Features (Socket.IO)

1. Open a ticket in admin panel
2. Open the same ticket in widget (different browser/incognito)
3. Send a message from widget
4. **Expected:** Message appears in admin panel instantly

### Test 5: Email Functionality

1. Test password reset or notification email
2. **Expected:** Email sent successfully

---

## 🎯 Common Hostinger Configurations

### Configuration A: Using Hostinger's Node.js App Manager

```yaml
# Dashboard → Node.js Applications → Add New

Repository: https://github.com/wzatco/Wzatco-HelpDesk.git
Branch: main
Node Version: 20.x
Entry Point: server.js
Auto Deploy: Enabled (deploys on git push)
```

### Configuration B: Using Hostinger's Git Integration

```yaml
# Dashboard → Git → Add Repository

Repository: wzatco/Wzatco-HelpDesk
Branch: main
Build Command: npm install && npm run build
Start Command: npm start
Auto Deploy: On push to main
```

### Configuration C: Manual Deployment via FTP/SSH

If Hostinger doesn't have automated Git deployment:

1. **Upload files via FTP:**
   - Upload all files EXCEPT `node_modules`, `.next`, `.env`
   - Upload `package.json`, `package-lock.json`, `server.js`, etc.

2. **Connect via SSH:**
   ```bash
   ssh your-username@your-server.hostinger.com
   cd /path/to/your/app
   ```

3. **Install and build:**
   ```bash
   npm install
   npm run build
   ```

4. **Start application:**
   ```bash
   npm start
   # Or use PM2 for process management:
   pm2 start server.js --name "adminnagent"
   pm2 save
   ```

---

## 📊 Deployment Summary

### What Gets Deployed:

✅ **Included:**
- All source code (pages, components, lib, etc.)
- `package.json` and `package-lock.json`
- `server.js` (custom Node.js server)
- `prisma/schema.prisma`
- Public assets (images, logos, etc.)
- Configuration files (next.config.js, tailwind.config.js)

❌ **Excluded (via .gitignore):**
- `node_modules/` (reinstalled during build)
- `.next/` (rebuilt during build)
- `.env` files (set via Hostinger dashboard)

### Build Process:

```
1. Clone Repository
   ↓
2. npm install (installs dependencies + runs prisma generate)
   ↓
3. npm run build (prisma generate + next build)
   ↓
4. npm start (node server.js)
   ↓
5. Server listens on Hostinger's assigned PORT
```

---

## 🔗 Important URLs

| Purpose | URL |
|---------|-----|
| **Production Site** | https://darkslateblue-quail-683975.hostingersite.com |
| **Admin Login** | https://darkslateblue-quail-683975.hostingersite.com/admin/login |
| **Agent Login** | https://darkslateblue-quail-683975.hostingersite.com/agent/login |
| **Knowledge Base** | https://darkslateblue-quail-683975.hostingersite.com/knowledge-base |
| **GitHub Repository** | https://github.com/wzatco/Wzatco-HelpDesk |
| **Database Host** | 82.180.140.4:3306 |

---

## 📞 Support Contacts

### Hostinger Support
- **Dashboard:** https://hpanel.hostinger.com
- **Support:** Live chat in dashboard
- **Documentation:** https://support.hostinger.com

### If Deployment Fails
1. Check Hostinger build logs
2. Review this guide's troubleshooting section
3. Check server logs (if SSH access available)
4. Contact Hostinger support with error details

---

## ✅ Final Checklist

Before considering deployment complete:

- [ ] Application accessible at production URL
- [ ] Admin login works
- [ ] Dashboard shows correct data
- [ ] Tickets can be created/viewed
- [ ] Real-time chat works
- [ ] Email notifications sent successfully
- [ ] No console errors in browser
- [ ] No 500 errors in production
- [ ] Database connections stable
- [ ] All features tested

---

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ Site loads at: `https://darkslateblue-quail-683975.hostingersite.com`
2. ✅ Admin can log in and see dashboard
3. ✅ Existing data visible (24 tickets, 9 agents)
4. ✅ New tickets can be created
5. ✅ Chat/messaging works in real-time
6. ✅ No errors in browser console
7. ✅ Server logs show "Server Ready" message

---

**Deployment Guide Version:** 1.0  
**Last Updated:** January 1, 2026  
**Application:** AdminNAgent Helpdesk System  
**Stack:** Next.js 15 + React 19 + MySQL + Socket.IO

**Good luck with your deployment! 🚀**

