# Hostinger Environment Variables - Quick Copy Guide

## 🔴 CRITICAL (Copy These First)

| Variable Name | Value |
|--------------|-------|
| `DATABASE_URL` | `mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo` |
| `JWT_SECRET` | `f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453` |
| `NEXTAUTH_SECRET` | `f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453` |
| `NEXT_PUBLIC_BASE_URL` | `https://darkslateblue-quail-683975.hostingersite.com` |
| `NODE_ENV` | `production` |

---

## 🟡 EMAIL CONFIGURATION (Required for Email Features)

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

## 🟢 OPTIONAL (Can Configure Later via Admin UI)

| Variable Name | Value | Note |
|--------------|-------|------|
| `HMAC_SECRET` | `f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453` | Falls back to JWT_SECRET if not set |
| `GOOGLE_CLIENT_ID` | *(Leave empty for now)* | Configure via Admin → Settings → Integrations |
| `GOOGLE_CLIENT_SECRET` | *(Leave empty for now)* | Configure via Admin → Settings → Integrations |
| `OPENAI_API_KEY` | *(Leave empty for now)* | Configure via Admin → Settings → AI |
| `ANTHROPIC_API_KEY` | *(Leave empty for now)* | Configure via Admin → Settings → AI |

---

## 📋 How to Add in Hostinger

### Method 1: Via Hostinger Dashboard (Recommended)

1. **Log in to Hostinger** (hpanel.hostinger.com)
2. **Navigate to your website**
3. Go to **Advanced** → **Environment Variables** (or similar menu)
4. Click **"+ Add Variable"** or **"Add New"**
5. **Copy each variable** from the table above:
   - **Name:** (left column - e.g., `DATABASE_URL`)
   - **Value:** (right column - the actual value)
6. **Save** after adding each variable
7. After adding all variables, **redeploy** your application

### Method 2: Via .env File (If Hostinger Uses File-Based Config)

Some Hostinger setups use a `.env` file in the root directory:

1. **Access File Manager** or **FTP**
2. Navigate to your website root directory
3. Create or edit `.env` file
4. Paste the contents from `HOSTINGER_ENV_VARIABLES.txt`
5. Save the file
6. Restart/redeploy your application

---

## ✅ Verification Checklist

After setting environment variables:

- [ ] All **5 CRITICAL variables** are set
- [ ] All **9 EMAIL variables** are set (if you need email)
- [ ] `NEXT_PUBLIC_BASE_URL` matches your actual URL
- [ ] No typos in variable names (case-sensitive!)
- [ ] No extra spaces before/after values
- [ ] Application redeployed/restarted
- [ ] Test by visiting: https://darkslateblue-quail-683975.hostingersite.com/admin/login

---

## 🔍 Testing the Configuration

After deployment, test your setup:

1. **Visit your site:** https://darkslateblue-quail-683975.hostingersite.com
2. **Try logging in** with your credentials
3. **Check if you see your data** (24 tickets, 9 agents, etc.)
4. If you see errors, check Hostinger logs for missing env vars

---

## ⚠️ Important Notes

1. **Database Connection:**
   - Both local and production use the SAME database
   - Data will be synchronized automatically
   - Any changes locally will appear in production

2. **Security:**
   - These secrets are for your specific setup
   - Don't share JWT_SECRET or database credentials
   - Consider rotating AWS SES credentials (they're exposed in your codebase)

3. **Optional Variables:**
   - Google OAuth and AI keys can be set later via Admin UI
   - You don't need them for basic functionality
   - They'll fall back to database configuration

---

## 🆘 Troubleshooting

### "Database connection failed"
- ✅ Double-check `DATABASE_URL` is copied correctly
- ✅ No extra spaces or line breaks
- ✅ Password is exactly: `Rohan_1025`

### "JWT validation error"
- ✅ Verify `JWT_SECRET` matches exactly (no spaces)
- ✅ `NEXTAUTH_SECRET` should be the same value

### "Cannot find module" or build errors
- ✅ Confirm `better-sqlite3` was removed (we did this)
- ✅ Check Hostinger build logs
- ✅ Try rebuilding/redeploying

### "Environment variable not found"
- ✅ Verify variable names are EXACT (case-sensitive)
- ✅ Application was redeployed after adding variables
- ✅ Try restarting the application

---

**Total Variables to Set:** 14 (5 critical + 9 email)

**Ready to deploy!** 🚀

