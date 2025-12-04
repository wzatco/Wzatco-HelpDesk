# 🚀 Neon Database Setup Guide

## ✅ You've Created Neon Database!

Great! Now let's connect it to your application.

---

## 📋 Step-by-Step Setup

### **Step 1: Set Up Local Environment**

1. **Create `.env` file** in your project root (if it doesn't exist):
   ```env
   DATABASE_URL=postgresql://neondb_owner:npg_iFHl5j3WPyQC@ep-crimson-base-ad14rm9i-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

2. **Test the connection:**
   ```bash
   node test-neon-connection.js
   ```
   
   You should see: `✅ Successfully connected to Neon database!`

---

### **Step 2: Generate Prisma Client**

```bash
npx prisma generate
```

This generates the Prisma client for PostgreSQL.

---

### **Step 3: Create Database Schema**

You have two options:

#### **Option A: Push Schema (Quick - for development)**
```bash
npx prisma db push
```

This will:
- Create all tables in your Neon database
- Skip migration history
- Good for initial setup

#### **Option B: Create Migration (Recommended - for production)**
```bash
npx prisma migrate dev --name init
```

This will:
- Create migration files
- Apply schema to database
- Track migration history
- Better for production

**Choose Option A for now** (faster), then use Option B for production.

---

### **Step 4: Add Environment Variable to Vercel**

1. **Go to Vercel Dashboard:**
   - Your Project → **Settings** → **Environment Variables**

2. **Add new variable:**
   - **Name:** `DATABASE_URL`
   - **Value:** `postgresql://neondb_owner:npg_iFHl5j3WPyQC@ep-crimson-base-ad14rm9i-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Environments:** ✅ Production ✅ Preview ✅ Development
   - Click **Save**

3. **Optional - Add unpooled connection (for migrations):**
   - **Name:** `DATABASE_URL_UNPOOLED`
   - **Value:** `postgresql://neondb_owner:npg_iFHl5j3WPyQC@ep-crimson-base-ad14rm9i.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Environments:** ✅ Production ✅ Preview ✅ Development
   - Click **Save**

---

### **Step 5: Deploy to Vercel**

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Setup Neon PostgreSQL database"
   git push origin main
   ```

2. **Vercel will automatically:**
   - Build your project
   - Run `prisma generate` (via postinstall script)
   - Deploy

3. **After first deployment, run migrations:**
   
   **Option A: Via Vercel CLI (Recommended)**
   ```bash
   # Install Vercel CLI if not installed
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link your project
   vercel link
   
   # Pull environment variables
   vercel env pull .env.local
   
   # Run migrations
   npx prisma migrate deploy
   ```
   
   **Option B: Via Vercel Dashboard**
   - Go to your deployment
   - Open **Functions** tab
   - Or use Vercel's built-in terminal (if available)

---

### **Step 6: Migrate Your Existing Data (Optional)**

If you have data in your SQLite database that you want to migrate:

1. **Export from SQLite:**
   ```bash
   # Install sqlite3 if needed
   npm install -g sqlite3
   
   # Export data
   sqlite3 prisma/dev.db .dump > sqlite-export.sql
   ```

2. **Convert and import to PostgreSQL:**
   - SQLite and PostgreSQL have different syntax
   - You may need to manually adjust or use a migration tool
   - Or recreate data through your application UI

**For now, you can start fresh** and create data through your admin panel.

---

## 🔍 Verify Setup

### **Test Locally:**
```bash
# Test connection
node test-neon-connection.js

# Check database
npx prisma studio
# This opens a GUI to view your database
```

### **Test on Vercel:**
1. Deploy your app
2. Visit: `https://your-app.vercel.app/api/admin/check-db`
3. Should return database counts

---

## 🎯 Quick Commands Reference

```bash
# Test connection
node test-neon-connection.js

# Generate Prisma client
npx prisma generate

# Push schema (quick)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name migration_name

# Deploy migrations (production)
npx prisma migrate deploy

# Open database GUI
npx prisma studio
```

---

## ⚠️ Important Notes

1. **Connection Pooling:**
   - Use `DATABASE_URL` (with `-pooler`) for regular queries
   - Use `DATABASE_URL_UNPOOLED` (without `-pooler`) for migrations

2. **SSL Required:**
   - Neon requires SSL connections
   - Your connection string already includes `?sslmode=require`

3. **IP Whitelisting:**
   - Neon allows connections from anywhere by default
   - No IP whitelisting needed

4. **Free Tier Limits:**
   - 0.5 GB storage
   - 10 projects
   - Perfect for development and small production apps

---

## 🐛 Troubleshooting

### **Error: "Connection refused"**
- Check your connection string
- Ensure `sslmode=require` is included
- Verify database is active in Neon dashboard

### **Error: "Table does not exist"**
- Run: `npx prisma db push` or `npx prisma migrate deploy`
- Check that migrations ran successfully

### **Error: "Prisma Client not generated"**
- Run: `npx prisma generate`
- Check that `postinstall` script is in package.json

### **Error: "Environment variable not found"**
- Make sure `.env` file exists locally
- Check Vercel environment variables are set
- Redeploy after adding environment variables

---

## ✅ Checklist

- [ ] Created `.env` file with `DATABASE_URL`
- [ ] Tested connection locally (`node test-neon-connection.js`)
- [ ] Generated Prisma client (`npx prisma generate`)
- [ ] Pushed schema to database (`npx prisma db push`)
- [ ] Added `DATABASE_URL` to Vercel environment variables
- [ ] Committed and pushed changes to GitHub
- [ ] Deployed to Vercel
- [ ] Ran migrations on Vercel (if using migrations)
- [ ] Tested deployed application

---

**You're all set!** Your Neon database is now connected and ready to use. 🎉

