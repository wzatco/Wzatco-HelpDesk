# 🚀 PRODUCTION ENVIRONMENT VARIABLES - IMPORT GUIDE

## 📁 File Created: `PRODUCTION_ENV_IMPORT.env`

This file contains ALL production environment variables ready to import directly into Hostinger.

---

## ✅ **METHOD 1: Import via Hostinger Dashboard (Recommended)**

### Step-by-Step Instructions:

1. **Log in to Hostinger**
   - Visit: https://hpanel.hostinger.com
   - Log in with your credentials

2. **Navigate to Your Website**
   - Find your website in the dashboard
   - Click on it to manage

3. **Go to Environment Variables**
   - Click **Advanced** (or **Settings**)
   - Find **Environment Variables** section
   - Click **Import** or **Bulk Import** (if available)

4. **Import the File**
   - Upload `PRODUCTION_ENV_IMPORT.env`
   - OR Copy all contents and paste in bulk import field
   - Click **Save** or **Apply**

5. **Redeploy**
   - Go to **Deployments** section
   - Click **Redeploy** or **Restart Application**
   - Wait 2-3 minutes for rebuild

---

## ✅ **METHOD 2: Copy-Paste Individual Variables**

If Hostinger doesn't support bulk import, add each variable manually:

### 🔴 **CRITICAL VARIABLES (Must Have):**

| Variable Name | Value |
|--------------|-------|
| `DATABASE_URL` | `mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo` |
| `JWT_SECRET` | `f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453` |
| `NEXTAUTH_SECRET` | `f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453` |
| `NEXT_PUBLIC_BASE_URL` | `https://darkslateblue-quail-683975.hostingersite.com` |
| `NODE_ENV` | `production` |

### 🟡 **EMAIL VARIABLES (Recommended):**

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

---

## ✅ **METHOD 3: Via Hostinger File Manager (If Using .env File)**

Some Hostinger setups use a `.env` file in the root directory:

1. **Access File Manager**
   - Log in to Hostinger
   - Go to **File Manager**

2. **Navigate to Website Root**
   - Find your website's root directory
   - Usually: `/public_html/` or `/httpdocs/`

3. **Upload or Create .env**
   - If `.env` exists: Edit it
   - If not: Create new file named `.env`
   - Copy ENTIRE contents from `PRODUCTION_ENV_IMPORT.env`
   - Save the file

4. **Restart Application**
   - Some Hostinger plans auto-detect changes
   - Others need manual restart from dashboard

---

## ⚠️ **IMPORTANT: Validation Checklist**

Before saving, verify these points:

### ✅ **Format Validation:**
- [ ] **NO quotes** around any values
- [ ] **NO spaces** around the `=` sign
- [ ] Variable names are **EXACT** (case-sensitive)
- [ ] `DATABASE_URL` starts with `mysql://`
- [ ] `NEXT_PUBLIC_BASE_URL` has `https://` (not http)

### ✅ **Value Validation:**
- [ ] `DATABASE_URL` host is `82.180.140.4`
- [ ] Database name is `u394742293_HD_demo`
- [ ] `NODE_ENV` is `production` (not development)
- [ ] `NEXT_PUBLIC_BASE_URL` matches your actual Hostinger URL

### ✅ **Post-Import Validation:**
- [ ] All 14 variables are set
- [ ] Application redeployed/restarted
- [ ] Wait 2-3 minutes for rebuild
- [ ] Test: Visit your login page
- [ ] Test: Try logging in

---

## 🧪 **Testing After Import**

### **Step 1: Check if Variables Are Loaded**

If Hostinger provides SSH access, run:
```bash
echo $DATABASE_URL
```

Should output:
```
mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo
```

### **Step 2: Test Login Page**

1. Visit: `https://darkslateblue-quail-683975.hostingersite.com/admin/login`
2. Open browser console (F12)
3. Try to log in
4. Check network tab for `/api/admin/auth/login`

**Expected Results:**
- ✅ Status: **200** or **401** (database connected)
- ❌ Status: **500** (database connection failed - check variables)

### **Step 3: Check Logs**

If login still fails:
1. Go to Hostinger dashboard
2. Find **Logs** or **Error Logs**
3. Look for Prisma/Database errors
4. Common errors:
   - `URL must start with protocol mysql://` → DATABASE_URL has quotes
   - `Connection refused` → Database credentials wrong
   - `Environment variable not found` → Variables not loaded (restart needed)

---

## 🔧 **Troubleshooting**

### **Problem: 500 Error Persists**

**Solution 1: Check Environment Variables**
```
1. Verify all variables are set
2. Check for typos in variable NAMES
3. Ensure no quotes around values
4. Restart/redeploy application
```

**Solution 2: Clear Build Cache**
```
1. Go to Hostinger dashboard
2. Find "Clear Cache" or "Rebuild"
3. Force rebuild application
4. Wait 3-5 minutes
```

**Solution 3: Check Database Access**
```
1. Verify MySQL server is accessible from Hostinger
2. Check firewall allows Hostinger IP
3. Test database credentials
```

### **Problem: Variables Not Loading**

**Solution:**
```
1. Ensure variables are set for PRODUCTION environment
2. Check if Hostinger uses .env file vs dashboard variables
3. Restart application (some hosting needs manual restart)
4. Check if deployment was successful
```

### **Problem: Login Works but Shows Empty Data**

**Solution:**
```
1. Database connection OK but no data
2. Run migration on production:
   - We already migrated 191 records to MySQL
   - Database should have data
3. Check if DATABASE_URL points to correct database
```

---

## 📊 **File Contents Summary**

The `PRODUCTION_ENV_IMPORT.env` file contains:

| Category | Variables Count | Required? |
|----------|----------------|-----------|
| Database | 1 | ✅ Critical |
| Authentication | 2 | ✅ Critical |
| Application | 2 | ✅ Critical |
| Email | 9 | 🟡 Optional |
| **TOTAL** | **14** | 5 Critical + 9 Optional |

---

## 🎯 **Expected Outcome**

After successfully importing and redeploying:

✅ **Login page loads** (no frontend errors)
✅ **Login works** (can authenticate)
✅ **Dashboard loads** (can see data)
✅ **All APIs work** (tickets, agents, settings, etc.)
✅ **Same data as local** (both use same MySQL database)

---

## 📞 **Need Help?**

If you encounter issues:

1. **Share the error message** from browser console
2. **Share Hostinger logs** (if accessible)
3. **Verify which variables are set** in Hostinger
4. **Check deployment status** (success/failed)

---

## 🎊 **Success Indicators**

You'll know it worked when:

1. Login page loads without console errors
2. Can log in with `demo@wzatco.com`
3. Dashboard shows your 24 tickets, 9 agents
4. No 500 errors in network tab
5. All admin features work

---

**File Location:** `PRODUCTION_ENV_IMPORT.env` (in your project root)

**Ready to import!** Just upload this file to Hostinger or copy-paste the variables. 🚀

---

**End of Import Guide**

