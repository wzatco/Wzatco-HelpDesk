# 🚀 Quick GitHub & Vercel Setup

## Step 1: Configure Git (Required First!)

Run these commands in PowerShell (replace with your info):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Use your GitHub username and email!**

---

## Step 2: Create Initial Commit

After configuring Git, run:

```bash
git commit -m "Initial commit: AdminNAgent - Admin Panel and Agent Management System"
```

---

## Step 3: Create GitHub Repository

1. Go to: https://github.com/new
2. **Repository name:** `AdminNAgent`
3. **Description:** "Admin Panel and Agent Management System with SLA Workflows"
4. **Visibility:** Choose **Private** (recommended) or **Public**
5. **DO NOT** check "Initialize with README"
6. Click **"Create repository"**

---

## Step 4: Push to GitHub

After creating the repository, GitHub will show you commands. Run these:

```bash
# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/AdminNAgent.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Note:** When prompted for credentials:
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token** (see below)

---

## Step 5: Create Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Note:** "AdminNAgent Access"
4. **Expiration:** 90 days (or your preference)
5. **Select scopes:** Check `repo` (all repo permissions)
6. Click **"Generate token"**
7. **Copy the token** (you won't see it again!)
8. Use this token as your password when pushing

---

## Step 6: Deploy to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. **Go to:** https://vercel.com
2. **Sign up/Login** (use GitHub to sign in)
3. Click **"Add New Project"**
4. **Import Git Repository:**
   - Select your `AdminNAgent` repository
   - Click **"Import"**
5. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
6. **Environment Variables:**
   - Add all your `.env` variables:
     - `DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL`
     - Any other API keys
7. Click **"Deploy"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production
vercel --prod
```

---

## Step 7: Configure Vercel Environment Variables

After deployment, add environment variables:

1. Go to your project on Vercel
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your production database URL
   - **Environment:** Production, Preview, Development (select all)
4. Repeat for all variables
5. **Redeploy** after adding variables

---

## Step 8: Database Setup for Production

### Option A: Use Vercel Postgres (Recommended)

1. In Vercel dashboard, go to **"Storage"**
2. Click **"Create Database"** → **"Postgres"**
3. Copy the connection string
4. Add as `DATABASE_URL` environment variable
5. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Use External Database

- Use services like:
  - **Supabase** (free tier available)
  - **PlanetScale** (free tier)
  - **Railway** (free tier)
  - **Neon** (free tier)

---

## ✅ Verification

1. **GitHub:** Check https://github.com/YOUR_USERNAME/AdminNAgent
2. **Vercel:** Check your deployment URL (e.g., `adminnagent.vercel.app`)
3. **Test:** Visit your deployed site and verify it works

---

## 🔄 Future Updates

After making changes:

```bash
# Commit changes
git add .
git commit -m "Description of changes"

# Push to GitHub
git push

# Vercel will auto-deploy!
```

Vercel automatically deploys when you push to GitHub!

---

## 🆘 Troubleshooting

### Git Authentication Failed
- Use Personal Access Token, not password
- Make sure token has `repo` scope

### Vercel Build Fails
- Check build logs in Vercel dashboard
- Make sure all environment variables are set
- Check `package.json` has correct build script

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Make sure database allows connections from Vercel IPs
- Check Prisma migrations are up to date

---

**Good luck! 🎉**

