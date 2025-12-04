# 🎉 Post-Deployment Setup Guide

## ✅ Deployment Successful!

Your AdminNAgent is now live on Vercel! But you need to configure a few things for it to work properly.

---

## 🔴 CRITICAL: Add Environment Variables

Your app needs environment variables to function. Follow these steps:

### Step 1: Access Project Settings

1. In Vercel dashboard, click on your **AdminNAgent** project
2. Click **"Settings"** tab (top navigation)
3. Click **"Environment Variables"** in the left sidebar

### Step 2: Add Required Variables

Add these variables one by one:

#### 1. DATABASE_URL (Required)
```
Name: DATABASE_URL
Value: [Your production database connection string]
Environment: Production, Preview, Development (select all)
```

**How to get DATABASE_URL:**
- **Option A:** Use Vercel Postgres (see Database Setup below)
- **Option B:** Use Supabase, PlanetScale, or another database service

#### 2. NEXTAUTH_SECRET (Required)
```
Name: NEXTAUTH_SECRET
Value: [Generate a random secret]
Environment: Production, Preview, Development (select all)
```

**Generate the secret:**
Run this in PowerShell:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copy the output and use it as the value.

#### 3. NEXTAUTH_URL (Required)
```
Name: NEXTAUTH_URL
Value: https://adminnagent.vercel.app
Environment: Production, Preview, Development (select all)
```
**Note:** Replace `adminnagent` with your actual Vercel project name if different.

#### 4. Optional Variables (if you use them)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`

### Step 3: Redeploy After Adding Variables

1. Go to **"Deployments"** tab
2. Click the **"..."** menu (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

---

## 🗄️ Database Setup

You need a production database. Here are your options:

### Option A: Vercel Postgres (Easiest - Recommended)

1. In Vercel dashboard, go to **"Storage"** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose **"Hobby"** plan (free tier)
5. Click **"Create"**
6. Once created:
   - Click on the database
   - Go to **"Settings"** tab
   - Copy the **"Connection String"**
   - Add it as `DATABASE_URL` environment variable
7. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Supabase (Free Tier)

1. Go to: https://supabase.com
2. Sign up / Login
3. Click **"New Project"**
4. Fill in:
   - **Name:** AdminNAgent
   - **Database Password:** (choose a strong password)
   - **Region:** Choose closest to you
5. Click **"Create new project"**
6. Wait for project to be created (2-3 minutes)
7. Go to **Settings** → **Database**
8. Copy the **Connection String** (URI format)
9. Add as `DATABASE_URL` in Vercel
10. Run migrations:
    ```bash
    npx prisma migrate deploy
    ```

### Option C: Other Services

- **PlanetScale:** https://planetscale.com
- **Railway:** https://railway.app
- **Neon:** https://neon.tech

---

## 🔧 Run Database Migrations

After setting up your database:

### Method 1: Via Vercel CLI (Recommended)

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project (select AdminNAgent when prompted)
vercel link

# Run migrations
npx prisma migrate deploy
```

### Method 2: Via Local Connection

1. Set `DATABASE_URL` in your local `.env` file
2. Make sure your database allows external connections
3. Run:
   ```bash
   npx prisma migrate deploy
   ```

---

## ✅ Verify Your Deployment

1. **Visit Your Site:**
   - Go to: `https://adminnagent.vercel.app` (or your custom URL)
   - Check if the site loads

2. **Test Key Features:**
   - Login page should work
   - Database connections should work
   - API routes should function

3. **Check Logs:**
   - In Vercel dashboard, go to **"Deployments"**
   - Click on your deployment
   - Check **"Function Logs"** for any errors

---

## 🐛 Troubleshooting

### Site Shows Errors

**Check:**
- All environment variables are set correctly
- Database is connected and accessible
- Migrations have been run
- Check Vercel function logs for errors

### Database Connection Errors

**Check:**
- `DATABASE_URL` is correct
- Database allows connections from Vercel IPs
- Database is not paused (for free tiers)
- Connection string format is correct

### Authentication Not Working

**Check:**
- `NEXTAUTH_SECRET` is set
- `NEXTAUTH_URL` matches your Vercel URL
- Both variables are set for all environments

### Build Errors

**Check:**
- All required environment variables are set
- `package.json` has correct scripts
- Check build logs in Vercel dashboard

---

## 🚀 Next Steps

1. ✅ **Add Environment Variables** (Critical!)
2. ✅ **Set Up Database** (Critical!)
3. ✅ **Run Migrations** (Critical!)
4. 🔄 **Redeploy** after adding variables
5. 🧪 **Test Your Site**
6. 📊 **Enable Speed Insights** (optional)
7. 🌐 **Add Custom Domain** (optional)

---

## 📝 Quick Checklist

- [ ] Added `DATABASE_URL` environment variable
- [ ] Added `NEXTAUTH_SECRET` environment variable
- [ ] Added `NEXTAUTH_URL` environment variable
- [ ] Created production database
- [ ] Ran database migrations
- [ ] Redeployed after adding variables
- [ ] Tested the deployed site
- [ ] Verified login works
- [ ] Checked API routes

---

## 🎯 Your Site URL

Your AdminNAgent is live at:
**https://adminnagent.vercel.app**

(Replace `adminnagent` with your actual project name if different)

---

**Once you've added the environment variables and set up the database, your app will be fully functional!** 🎉

