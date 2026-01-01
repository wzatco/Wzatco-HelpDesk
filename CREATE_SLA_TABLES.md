# 🔧 Fix: Database Tables Don't Exist

## ❌ The Error

```
The table `main.SLAPolicy` does not exist in the current database.
```

**Good news:** Prisma client is now working! ✅  
**Bad news:** The SLA tables haven't been created in the database yet.

---

## ✅ The Solution

You need to create the database tables. Choose **ONE** of these methods:

### **Method 1: Quick Push (Recommended for Development)**

This is faster and doesn't create migration files:

```bash
npx prisma db push
```

This will:
- ✅ Create all SLA tables (SLAPolicy, SLAWorkflow, SLATimer, SLABreach, SLAEscalation)
- ✅ No migration history files
- ✅ Works immediately

---

### **Method 2: Create Migration (Recommended for Production)**

This creates a migration file you can track:

```bash
npx prisma migrate dev --name add_sla_tables
```

This will:
- ✅ Create all SLA tables
- ✅ Create migration file in `prisma/migrations/`
- ✅ Keeps history of schema changes
- ✅ Can be applied to production later

---

## 🎯 What Tables Will Be Created

Running either command will create these 5 tables:

1. **`SLAPolicy`** - SLA policies (response/resolution times)
2. **`SLAWorkflow`** - Visual workflows (your canvas designs!)
3. **`SLATimer`** - Active timers for tickets
4. **`SLABreach`** - Breach tracking and logging
5. **`SLAEscalation`** - Escalation history

---

## 📋 Full Steps

### **Option A: Quick Setup (db push)**

```bash
# 1. Stop dev server (Ctrl+C if running)

# 2. Push schema to database
npx prisma db push

# 3. Restart dev server
npm run dev
```

### **Option B: With Migrations (migrate dev)**

```bash
# 1. Stop dev server (Ctrl+C if running)

# 2. Create migration and apply it
npx prisma migrate dev --name add_sla_tables

# 3. Restart dev server
npm run dev
```

---

## 📝 Expected Output

### **For `npx prisma db push`:**

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"

🚀  Your database is now in sync with your Prisma schema. Done in 156ms

✔ Generated Prisma Client (v6.19.0) to .\node_modules\@prisma\client in 89ms
```

### **For `npx prisma migrate dev`:**

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"

SQLite database dev.db created at file:./dev.db

Applying migration `20240103120000_add_sla_tables`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240103120000_add_sla_tables/
    └─ migration.sql

✔ Generated Prisma Client (v6.19.0) to .\node_modules\@prisma\client in 89ms
```

---

## 🎉 After Running

1. ✅ All 5 SLA tables will exist in your database
2. ✅ The API will be able to create/read SLA data
3. ✅ **Saving workflows will work perfectly!** 🚀

---

## 🚀 Test It!

After restarting the dev server:

1. **Open workflow builder** → `/admin/sla/workflows/builder`
2. **Create a simple workflow:**
   - Add "Ticket Created" node
   - Configure it
   - Name your workflow
3. **Click "Save Draft"**
4. **Should work!** ✅

You'll see: "Workflow saved successfully!" 🎉

---

## 🔍 Why This Happened

Your Prisma schema (`prisma/schema.prisma`) defines the SLA models, but:
- ❌ The tables didn't exist in the SQLite database (`dev.db`)
- ✅ Now you're creating them!

---

## ⚠️ Important Notes

- **`db push`** is great for development (fast, no migration files)
- **`migrate dev`** is better for production (tracks changes, can replay)
- Both commands work equally well for this use case
- You only need to run this **once** (tables stay created)

---

## 🐛 If You Get an Error

If you see "Another migration is already running":
```bash
# Delete the lock file
rm prisma/migrations/migration_lock.toml

# Try again
npx prisma db push
```

If you see permission errors:
```bash
# Make sure dev server is stopped (Ctrl+C)
# Then try again
```

---

**TL;DR:** Run `npx prisma db push` → Restart server → Save workflows now works! 🎉

