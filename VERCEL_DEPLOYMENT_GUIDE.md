# 🚀 Vercel Deployment Guide - Database Setup

## ❌ Problem: SQLite Won't Work on Vercel

SQLite uses local files (`file:./dev.db`), which **cannot work** on Vercel because:
- Vercel is serverless (no persistent file storage)
- Each function execution is stateless
- Files are read-only in serverless environments

## ✅ Solution: Use a Cloud Database

You need to migrate from SQLite to a cloud database. **PostgreSQL is recommended** for Vercel.

---

## 📋 Step-by-Step Migration

### **Step 1: Choose a Database Provider**

**Recommended Options:**

1. **Vercel Postgres** (Easiest - Built-in)
   - Free tier: 256 MB storage
   - Direct integration with Vercel
   - [Sign up here](https://vercel.com/storage/postgres)

2. **Neon** (Recommended - Free tier)
   - Free tier: 0.5 GB storage
   - Serverless PostgreSQL
   - [Sign up here](https://neon.tech)

3. **Supabase** (Free tier)
   - Free tier: 500 MB storage
   - PostgreSQL with extra features
   - [Sign up here](https://supabase.com)

4. **Railway** (Free tier)
   - Free tier: $5 credit/month
   - Easy PostgreSQL setup
   - [Sign up here](https://railway.app)

---

### **Step 2: Create Your Cloud Database**

#### **Option A: Vercel Postgres (Easiest)**

1. Go to your Vercel project dashboard
2. Click **"Storage"** tab
3. Click **"Create Database"** → **"Postgres"**
4. Choose a name and region
5. Copy the connection string (it will be auto-added to environment variables)

#### **Option B: Neon (Recommended)**

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (looks like: `postgresql://user:pass@host/dbname`)
4. Save it for Step 3

#### **Option C: Supabase**

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the connection string under **"Connection string"**
5. Use the **"URI"** format

---

### **Step 3: Update Prisma Schema**

Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")  // Changed from "file:./dev.db"
}
```

**Note:** Keep all your models as-is. Prisma will handle the migration.

---

### **Step 4: Update Environment Variables**

#### **Local Development (.env)**

Create/update `.env` file in your project root:

```env
# For local development, use your cloud database connection string
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Or use a local PostgreSQL for development
# DATABASE_URL="postgresql://postgres:password@localhost:5432/adminnagent"
```

#### **Vercel Environment Variables**

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add:
   - **Name:** `DATABASE_URL`
   - **Value:** Your PostgreSQL connection string
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**

---

### **Step 5: Migrate Your Data**

#### **Option A: Export from SQLite, Import to PostgreSQL**

1. **Export data from SQLite:**
   ```bash
   # Install sqlite3 if not already installed
   npm install -g sqlite3
   
   # Export to SQL
   sqlite3 prisma/dev.db .dump > data.sql
   ```

2. **Convert SQLite SQL to PostgreSQL:**
   - SQLite and PostgreSQL have different syntax
   - You may need to manually adjust the SQL or use a converter
   - Or use Prisma migrations (recommended)

#### **Option B: Use Prisma Migrate (Recommended)**

1. **Generate migration:**
   ```bash
   npx prisma migrate dev --name migrate_to_postgresql
   ```

2. **This will:**
   - Create migration files
   - Apply schema to PostgreSQL
   - Generate Prisma client

3. **Seed your data:**
   ```bash
   # If you have seed scripts
   npx prisma db seed
   ```

#### **Option C: Manual Data Migration Script**

Create a script to copy data from SQLite to PostgreSQL (see `migrate-data.js` below).

---

### **Step 6: Update Vercel Build Settings**

1. Go to Vercel project → **Settings** → **General**
2. Under **"Build & Development Settings"**:
   - **Build Command:** `npm run build` (or `next build`)
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

3. **Add Build Command (if needed):**
   ```bash
   npx prisma generate && npm run build
   ```

---

### **Step 7: Deploy**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Migrate to PostgreSQL for Vercel"
   git push origin main
   ```

2. **Vercel will automatically:**
   - Detect the push
   - Run build with `DATABASE_URL` from environment variables
   - Deploy your app

3. **Check deployment logs:**
   - Go to Vercel dashboard → **Deployments**
   - Check for any errors

---

## 🔧 Troubleshooting

### **Error: "Environment variable DATABASE_URL not found"**

- Make sure `DATABASE_URL` is set in Vercel environment variables
- Check that it's enabled for the correct environment (Production/Preview/Development)

### **Error: "Connection refused" or "Timeout"**

- Check your database connection string
- Ensure your database allows connections from Vercel IPs
- For Neon/Supabase: Check firewall/network settings

### **Error: "Table does not exist"**

- Run migrations: `npx prisma migrate deploy` (in Vercel build or manually)
- Or use: `npx prisma db push` for development

### **Error: "Prisma Client not generated"**

- Add to build command: `npx prisma generate && npm run build`
- Or add `postinstall` script in `package.json`:
  ```json
  {
    "scripts": {
      "postinstall": "prisma generate"
    }
  }
  ```

---

## 📝 Quick Checklist

- [ ] Created cloud PostgreSQL database
- [ ] Updated `prisma/schema.prisma` to use `postgresql` and `env("DATABASE_URL")`
- [ ] Added `DATABASE_URL` to Vercel environment variables
- [ ] Created `.env` file locally with `DATABASE_URL`
- [ ] Ran `npx prisma generate` locally
- [ ] Migrated data from SQLite to PostgreSQL
- [ ] Updated Vercel build settings
- [ ] Deployed and tested

---

## 🎯 Recommended: Vercel Postgres

**Why Vercel Postgres?**
- ✅ Built-in integration
- ✅ Automatic connection string management
- ✅ No extra setup needed
- ✅ Works seamlessly with Vercel deployments

**Setup:**
1. Vercel Dashboard → Your Project → **Storage** → **Create Database** → **Postgres**
2. Connection string is automatically added to environment variables
3. Done! No manual configuration needed.

---

## 📚 Additional Resources

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Neon Documentation](https://neon.tech/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Need help?** Check the troubleshooting section or create an issue in your repository.

