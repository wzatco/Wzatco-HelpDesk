# ⚡ Quick Deployment Steps

## 1️⃣ Download Favicon
🔗 https://wzatco.com/wp-content/uploads/2025/08/cropped-Brand.webp
📁 Save to: `public/favicon.ico`

**Use generator for all sizes:** https://realfavicongenerator.net/

---

## 2️⃣ Commit & Push

```powershell
git add .
git commit -m "Fix: Add Prisma generate to build + WZATCO favicon"
git push origin main
```

---

## 3️⃣ Import Env Variables on Hostinger

**File:** `PRODUCTION_ENV_IMPORT.env`

**Location:** Hostinger → Your App → Environment Variables

**⚠️ CRITICAL:** Paste WITHOUT quotes!

```
DATABASE_URL=mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo
```
NOT: `DATABASE_URL="mysql://..."`

---

## 4️⃣ Watch Build Logs

**Look for:**
```
✅ Prisma schema loaded from prisma/schema.prisma
✅ Generated Prisma Client
✅ Compiled successfully
```

---

## 5️⃣ Test

1. Visit: https://darkslateblue-quail-683975.hostingersite.com/
2. Check: No 500 errors
3. Login: Admin credentials work
4. Verify: Favicon in browser tab

---

## ✅ Already Fixed

- ✅ Build command: `prisma generate && next build` (line 8 in package.json)
- ✅ Favicon metadata: `pages/_document.js` created
- ✅ PWA manifest: `public/site.webmanifest` created
- ✅ Database: MySQL migration complete
- ✅ Dependencies: `better-sqlite3` removed

---

## 🚨 If 500 Errors Persist

1. Check `DATABASE_URL` has NO quotes
2. Verify "Generated Prisma Client" in build logs
3. Clear cache and redeploy
4. Check browser console (F12) for specific error

---

**Full Guide:** `HOSTINGER_DEPLOYMENT_COMPLETE_GUIDE.md`

