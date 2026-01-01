# 🚀 Hostinger Quick Deploy Checklist

**Target:** https://darkslateblue-quail-683975.hostingersite.com  
**Repository:** https://github.com/wzatco/Wzatco-HelpDesk.git

---

## ⚡ Quick Steps (5 Minutes)

### Step 1: Hostinger Dashboard Setup
1. Log in: https://hpanel.hostinger.com
2. Go to **Node.js Applications** (or Git/Applications)
3. Click **"Add New"** or **"Create Application"**

### Step 2: Connect Repository
```
Repository URL: https://github.com/wzatco/Wzatco-HelpDesk.git
Branch: main
Node.js Version: 20.x (or 18.17+)
Entry Point: server.js
```

### Step 3: Build Commands
```
Install: npm install
Build: npm run build
Start: npm start
```

### Step 4: Add Environment Variables (14 Total)

**🔴 Copy-Paste These 5 Critical Variables:**
```env
DATABASE_URL=mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo
JWT_SECRET=f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453
NEXTAUTH_SECRET=f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453
NEXT_PUBLIC_BASE_URL=https://darkslateblue-quail-683975.hostingersite.com
NODE_ENV=production
```

**🟡 Copy-Paste These 9 Email Variables:**
```env
MAIL_HOST=email-smtp.ap-south-1.amazonaws.com
MAIL_PORT=465
MAIL_ENCRYPTION=ssl
MAIL_USERNAME=AKIA6ORTJ2B2BIIEBXP4
MAIL_PASSWORD=BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66
MAIL_FROM_ADDRESS=no-reply@wzatco.com
MAIL_FROM_NAME=Wzatco Support Desk
MAIL_REPLY_TO=support@wzatco.com
MAIL_DEBUG=false
```

### Step 5: Deploy
1. Click **"Deploy"** or **"Build & Deploy"**
2. Wait 3-5 minutes
3. Check build logs for success

### Step 6: Test
1. Visit: https://darkslateblue-quail-683975.hostingersite.com
2. Login: https://darkslateblue-quail-683975.hostingersite.com/admin/login
3. Check data loads correctly

---

## ✅ Success Indicators

- [ ] Build logs show "Compiled successfully"
- [ ] Site loads without 500 errors
- [ ] Admin login works
- [ ] Dashboard shows 24 tickets, 9 agents
- [ ] Real-time chat works

---

## 🆘 Quick Troubleshooting

**Database connection failed?**
→ Double-check `DATABASE_URL` has no extra spaces

**Build failed?**
→ Check Node.js version is 18.17+ or 20.x

**Environment variables not working?**
→ Redeploy after adding all variables

**Full troubleshooting:** See `HOSTINGER_DEPLOYMENT_GUIDE.md`

---

## 📞 Need Help?

- **Full Guide:** `HOSTINGER_DEPLOYMENT_GUIDE.md`
- **Environment Variables:** `HOSTINGER_ENV_VARIABLES.txt`
- **Server Requirements:** `SERVER_REQUIREMENTS.md`
- **Hostinger Support:** Live chat in hPanel dashboard

---

**Repository Status:** ✅ Clean and ready to deploy  
**Database:** ✅ MySQL configured and populated  
**Environment Variables:** ✅ Documented and ready  

**You're ready to deploy!** 🎉

