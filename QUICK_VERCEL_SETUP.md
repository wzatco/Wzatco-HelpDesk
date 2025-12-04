# ⚡ Quick Vercel Setup Guide

## 🎯 3-Step Setup

### **Step 1: Create PostgreSQL Database**

Choose one:

**A) Vercel Postgres (Easiest)**
1. Vercel Dashboard → Your Project → **Storage** → **Create Database** → **Postgres**
2. Done! Connection string is auto-added.

**B) Neon (Free, Recommended)**
1. Sign up: https://neon.tech
2. Create project → Copy connection string
3. Format: `postgresql://user:pass@host/dbname?sslmode=require`

**C) Supabase (Free)**
1. Sign up: https://supabase.com
2. Create project → Settings → Database → Copy connection string

---

### **Step 2: Add Environment Variable in Vercel**

1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `DATABASE_URL`
   - **Value:** Your PostgreSQL connection string
   - **Environments:** ✅ Production ✅ Preview ✅ Development
3. Click **Save**

---

### **Step 3: Deploy**

1. **Commit and push:**
   ```bash
   git add .
   git commit -m "Migrate to PostgreSQL for Vercel"
   git push origin main
   ```

2. **Vercel will automatically:**
   - Build your project
   - Run `prisma generate` (via postinstall script)
   - Deploy

3. **After deployment, run migrations:**
   - Go to Vercel → Your Project → **Deployments** → Click latest deployment
   - Open **Functions** tab → Find any API route
   - Or use Vercel CLI:
     ```bash
     npx vercel env pull .env.local
     npx prisma migrate deploy
     ```

---

## ✅ That's It!

Your app should now work on Vercel with PostgreSQL!

**Need to migrate existing SQLite data?** See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.

