# URGENT: Website Loading Issue - Troubleshooting

**Date:** January 1, 2026  
**Issue:** Website stuck on loading, not opening  
**Status:** INVESTIGATING

---

## 🚨 Possible Causes

1. **Server not started properly**
2. **Port binding issue**
3. **Build failed**
4. **Application crashed**
5. **Hostinger routing issue**

---

## 🔍 Immediate Diagnostics

### Step 1: Check if Server is Running

**In Hostinger Control Panel:**

1. Go to: **Node.js Application** or **Application Manager**
2. Look for status:
   - ✅ **Running** (green) = Good
   - ❌ **Stopped** (red) = Problem
   - ⚠️ **Starting** (yellow) = Wait

**If STOPPED:**
- Click **Start Application**
- Wait 1-2 minutes
- Try website again

### Step 2: Check Application Logs

**In Hostinger Panel:**

1. Go to: **Logs** or **Application Logs**
2. Look for errors:

**Good logs (server started):**
```
🚀 Starting Server...
✅ Loaded env from: .env.production
>> Hostinger Assigned Port: 12345
✅ Server Ready on http://0.0.0.0:12345
```

**Bad logs (crash):**
```
❌ FATAL ERROR: Server failed to start
Error: Cannot find module...
Error: connect ECONNREFUSED
```

### Step 3: Check Build Logs

In Hostinger deployment logs, look for:

**Success:**
```
✓ Compiled successfully
✓ Generating static pages
Build completed
```

**Failure:**
```
✗ Failed to compile
Error: Module not found
Build failed
```

---

## 🔧 Quick Fixes to Try

### Fix 1: Restart Application

```
Hostinger Panel
  → Node.js Application
  → Stop Application (wait 10 seconds)
  → Start Application (wait 60 seconds)
  → Try accessing website
```

### Fix 2: Check if npm start is Running

**Hostinger might need the start command configured:**

1. Go to: **Node.js Application Settings**
2. Check **Start Command:** Should be `npm start` or `node server.js`
3. If wrong, update it
4. Restart application

### Fix 3: Verify Port Configuration

**Check if PORT environment variable is set:**

1. Go to: **Environment Variables**
2. Look for: `PORT` variable
3. **DO NOT SET PORT MANUALLY** - Let Hostinger assign it automatically
4. If you see `PORT=3000` or any manual PORT, **DELETE IT**
5. Restart application

### Fix 4: Check Package.json Scripts

Make sure your `package.json` has:

```json
{
  "scripts": {
    "start": "node server.js",
    "build": "prisma generate && next build"
  }
}
```

### Fix 5: Rebuild from Scratch

If nothing works:

1. **In Hostinger Panel:**
   - Go to: **Deployments** or **Git Integration**
   - Click: **Rebuild** or **Redeploy**
   - Wait for build to complete (5-10 minutes)

2. **Or trigger from Git:**
   ```bash
   git commit --allow-empty -m "Force rebuild"
   git push origin main
   ```

---

## 🐛 Common Issues

### Issue 1: "502 Bad Gateway"

**Cause:** Server not running or crashed

**Solution:**
1. Check logs for crash reason
2. Restart application
3. Check DATABASE_URL is correct

### Issue 2: "Loading forever, then timeout"

**Cause:** Server listening on wrong port or interface

**Solution:**
1. Verify `server.js` binds to `0.0.0.0` (not `localhost`)
2. Check no manual PORT in environment variables
3. Restart application

### Issue 3: "This site can't be reached"

**Cause:** DNS or routing issue

**Solution:**
1. Check domain is active in Hostinger
2. Wait for DNS propagation (up to 24 hours for new domains)
3. Try accessing via: `http://` instead of `https://`

### Issue 4: "Application Error"

**Cause:** Build failed or dependencies missing

**Solution:**
1. Check build logs
2. Ensure `package.json` has all dependencies
3. Rebuild application

---

## 📊 Diagnostic Checklist

Run through this checklist:

- [ ] Application status is "Running" in Hostinger
- [ ] Build completed successfully (check deployment logs)
- [ ] No errors in application logs
- [ ] `server.js` exists and has correct startup code
- [ ] `package.json` has `"start": "node server.js"`
- [ ] DATABASE_URL is set to `mysql://...@127.0.0.1:3306/...`
- [ ] No manual PORT environment variable set
- [ ] Domain is active and pointing to Hostinger
- [ ] SSL certificate is active (if using https)

---

## 🔍 Test Direct IP Access

If domain isn't working, try accessing via IP:

**Find your server IP:**
1. Hostinger Panel → **Server Information**
2. Note the IP address
3. Try: `http://YOUR_IP:PORT`

*Note: This might not work if Hostinger uses reverse proxy*

---

## 📞 Get Real-Time Status

### Check Hostinger Status Page

Visit: https://www.hostinger.com/status

Look for:
- ❌ Server outages
- ⚠️ Maintenance windows
- 🔧 Known issues

### Contact Hostinger Support

If nothing works, contact support with:

```
Subject: Node.js Application Not Loading

My Node.js application is stuck loading and won't open.

Domain: darkslateblue-quail-683975.hostingersite.com
Application: Next.js with custom server.js

Status in panel: [Running/Stopped/Error]
Build status: [Success/Failed]
Error logs: [Copy any errors here]

Can you help investigate?

Thank you!
```

---

## 🎯 Most Likely Issues (In Order)

1. **Application crashed after DATABASE_URL change** (80% probability)
   - Solution: Check logs, restart app

2. **Server not binding to correct host/port** (15% probability)
   - Solution: Verify server.js has `hostname: '0.0.0.0'`

3. **Build failed** (5% probability)
   - Solution: Rebuild application

---

## ⚡ Emergency Quick Fix

If you need the site up NOW:

1. **Stop application**
2. **Remove DATABASE_URL temporarily**
3. **Start application** (site will load, but no DB features)
4. **Then add DATABASE_URL back once site is stable**

---

**End of Troubleshooting Guide**

