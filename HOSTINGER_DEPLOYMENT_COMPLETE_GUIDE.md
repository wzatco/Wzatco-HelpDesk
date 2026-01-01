# 🚀 Hostinger Production Deployment - Complete Guide

## ✅ Status: Ready to Deploy

### What's Been Fixed

1. ✅ **Build Command Updated** (Already Done)
   - `package.json` line 8: `"build": "prisma generate && next build"`
   - This ensures Prisma Client regenerates for MySQL on every build

2. ✅ **Environment Variables Ready**
   - File created: `PRODUCTION_ENV_IMPORT.env`
   - 15 variables ready to import
   - No quotes, no extra spaces

3. ✅ **Favicon Configuration Added**
   - `pages/_document.js` created with favicon metadata
   - `public/site.webmanifest` created for PWA support
   - **Action needed:** Download favicon from WZATCO website (see Step 4 below)

4. ✅ **Database Migration Complete**
   - SQLite → MySQL migration successful
   - `better-sqlite3` dependency removed
   - All data migrated

---

## 🔧 Deployment Steps

### Step 1: Download and Add Favicon

**Download from:** https://wzatco.com/wp-content/uploads/2025/08/cropped-Brand.webp

**Option A: Quick (Single File)**
1. Download the image above
2. Convert to ICO format using: https://convertio.co/webp-ico/
3. Save as `public/favicon.ico`

**Option B: Complete (All Sizes)**
1. Download the image above
2. Use favicon generator: https://realfavicongenerator.net/
3. Upload the downloaded image
4. Generate all sizes
5. Download and extract to `public/` folder

The generator will create:
- `favicon.ico` (main favicon)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

### Step 2: Commit and Push Changes

```powershell
# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Add Prisma generate to build command and add WZATCO favicon"

# Push to main branch
git push origin main
```

### Step 3: Import Environment Variables on Hostinger

1. **Login to Hostinger:**
   - Go to https://hpanel.hostinger.com/
   - Navigate to your hosting dashboard

2. **Access Node.js App Settings:**
   - Go to: Websites → Your Domain → Node.js Apps
   - Click on your application

3. **Import Environment Variables:**
   - Find "Environment Variables" section
   - Click "Import from File" (if available) or "Add Variable"
   - Use the file: `PRODUCTION_ENV_IMPORT.env`

4. **Manual Import (if auto-import not available):**
   Open `PRODUCTION_ENV_IMPORT.env` and copy each line:

   ```env
   DATABASE_URL=mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
   NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production-67890
   NEXTAUTH_URL=https://darkslateblue-quail-683975.hostingersite.com
   NEXT_PUBLIC_BASE_URL=https://darkslateblue-quail-683975.hostingersite.com
   NODE_ENV=production
   PORT=3000
   MAIL_USERNAME=noreply@wzatco.com
   MAIL_PASSWORD=admin@123W
   MAIL_HOST=smtp.hostinger.com
   MAIL_PORT=587
   MAIL_FROM=noreply@wzatco.com
   MAIL_FROM_NAME=WZATCO Support
   MAIL_REPLY_TO=support@wzatco.com
   MAIL_SECURE=false
   ```

   **⚠️ IMPORTANT:** 
   - Paste each variable WITHOUT quotes
   - Format: `KEY=value` (no spaces around `=`)
   - Do NOT include `export` keyword

### Step 4: Trigger Clean Deploy

1. **Option A: Automatic (if GitHub connected):**
   - After pushing to `main`, Hostinger will auto-deploy
   - Go to: Hostinger → Your App → Deployments
   - Watch the deployment logs

2. **Option B: Manual:**
   - Go to: Hostinger → Your App → Deployments
   - Click "Deploy Now" or "Redeploy"

### Step 5: Watch Build Logs

**Look for these success indicators:**

```
✅ Installing dependencies...
✅ npm install completed

✅ Building application...
✅ Running: npm run build

✅ Prisma schema loaded from prisma/schema.prisma
✅ Generated Prisma Client (x.x.x) to ./node_modules/@prisma/client

✅ Creating optimized production build...
✅ Compiled successfully

✅ Starting application...
✅ Server running on port 3000
```

**If you see these errors:**
- ❌ `PrismaClientInitializationError: Unknown arg database`
  → Environment variables not set correctly
  → Go back to Step 3

- ❌ `Cannot find module '@prisma/client'`
  → Build command didn't run
  → Check package.json line 8

- ❌ `Error: P2002 Unique constraint failed`
  → Database already has data (this is OK)

---

## 🧪 Testing After Deployment

### Test 1: Homepage Loads
```
Visit: https://darkslateblue-quail-683975.hostingersite.com/
Expected: Page loads without 500 error
```

### Test 2: Login Page Works
```
Visit: https://darkslateblue-quail-683975.hostingersite.com/admin/login
Expected: Login form displays, no console errors
```

### Test 3: Login Functionality
```
1. Enter admin credentials
2. Click "Sign In"
Expected: Dashboard loads, no 500 errors
```

### Test 4: Favicon Displays
```
1. Open homepage in browser
2. Check browser tab
Expected: WZATCO logo appears in browser tab
```

### Test 5: Database Connection
```
1. Login as admin
2. Navigate to: Tickets or Agents section
Expected: Data loads from MySQL database
```

---

## 🐛 Troubleshooting

### Problem: Still Getting 500 Errors

**Solution 1: Check Environment Variables**
```
1. Go to Hostinger → Your App → Environment Variables
2. Verify DATABASE_URL has NO quotes
3. Should be: mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo
4. NOT: "mysql://..." or 'mysql://...'
```

**Solution 2: Check Build Logs**
```
1. Go to Hostinger → Your App → Deployments → Latest Build
2. Look for "Prisma schema loaded" message
3. If missing, build command didn't run correctly
```

**Solution 3: Force Clean Rebuild**
```
1. Delete .next folder (if accessible via SSH/FTP)
2. Trigger new deployment
3. Or: In Hostinger, click "Clear Cache" then "Redeploy"
```

### Problem: 404 Errors for `_buildManifest.js`, `_ssgManifest.js`

**This is usually a build cache issue:**
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. If persists: Redeploy on Hostinger
```

### Problem: Favicon Not Showing

**Solution:**
```
1. Verify favicon files exist in public/ folder
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+F5)
4. Check: View Source → Look for <link rel="icon" href="/favicon.ico" />
```

### Problem: Database Connection Timeout

**Solution:**
```
1. Verify MySQL server is accessible: 82.180.140.4:3306
2. Check database credentials in DATABASE_URL
3. Test connection using MySQL Workbench or similar tool
4. Contact Hostinger support if server is down
```

---

## 📊 What to Expect

### Build Time
- **First deploy:** 5-10 minutes (includes npm install + Prisma generate)
- **Subsequent deploys:** 2-5 minutes (cache from previous build)

### Build Output Size
- **Next.js build:** ~100-200 MB
- **node_modules:** ~300-400 MB
- **Prisma Client:** ~5-10 MB

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Homepage loads (200 status)
- [ ] Login page loads (200 status)
- [ ] Can login with admin credentials
- [ ] Dashboard displays without errors
- [ ] Tickets page loads data from MySQL
- [ ] Agents page loads data from MySQL
- [ ] Favicon appears in browser tab
- [ ] No console errors in browser
- [ ] No 500 errors in network tab

---

## 🎉 Success Indicators

You'll know deployment is successful when:

1. ✅ Build logs show "Generated Prisma Client"
2. ✅ Application starts on port 3000
3. ✅ Homepage returns 200 status (not 500)
4. ✅ Login works and connects to MySQL
5. ✅ WZATCO favicon appears in browser tab

---

## 📝 Files Changed in This Update

1. ✅ `package.json` - Build command already correct (line 8)
2. ✅ `pages/_document.js` - NEW: Favicon metadata
3. ✅ `public/site.webmanifest` - NEW: PWA manifest
4. ⏳ `public/favicon.*` - TODO: Download from WZATCO website

---

## 🔗 Quick Reference Links

- **Production URL:** https://darkslateblue-quail-683975.hostingersite.com/
- **Hostinger Dashboard:** https://hpanel.hostinger.com/
- **Favicon Source:** https://wzatco.com/wp-content/uploads/2025/08/cropped-Brand.webp
- **Favicon Generator:** https://realfavicongenerator.net/
- **Environment Variables:** `PRODUCTION_ENV_IMPORT.env`
- **Database:** MySQL at 82.180.140.4:3306

---

## 🆘 Need Help?

If you encounter issues:

1. Check deployment logs in Hostinger dashboard
2. Review browser console for errors (F12)
3. Verify environment variables are set correctly
4. Test database connection separately
5. Contact Hostinger support for server-side issues

---

**Last Updated:** January 1, 2026  
**Database:** MySQL (u394742293_HD_demo)  
**Hosting:** Hostinger Node.js App

