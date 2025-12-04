# 🔧 Fix: Unable to Save Draft - Prisma Client Issue

## ❌ The Problem

```
TypeError: Cannot read properties of undefined (reading 'findUnique')
    at handler (pages\api\admin\sla\workflows\index.js:54:45)
```

**Root Cause:** The Prisma client hasn't been regenerated to include the SLA models (SLAPolicy, SLAWorkflow, etc.) that exist in your schema.

---

## ✅ The Solution

Follow these 3 simple steps:

### **Step 1: Stop the Dev Server**
In your terminal where `npm run dev` is running:
- Press `Ctrl + C` to stop the server
- Wait for it to fully stop

### **Step 2: Regenerate Prisma Client**
Run this command:
```bash
npx prisma generate
```

This will regenerate the Prisma client to include all SLA models from your schema:
- ✅ SLAPolicy
- ✅ SLAWorkflow  
- ✅ SLATimer
- ✅ SLABreach
- ✅ SLAEscalation

### **Step 3: Restart Dev Server**
```bash
npm run dev
```

---

## 🎯 What This Does

Your `prisma/schema.prisma` file already has all the SLA models defined (lines 602-772):

```prisma
model SLAPolicy {
  id            String   @id @default(cuid())
  name          String
  // ... full configuration
  workflows     SLAWorkflow[]
  timers        SLATimer[]
}

model SLAWorkflow {
  id            String   @id @default(cuid())
  policyId      String
  policy        SLAPolicy @relation(fields: [policyId], references: [id])
  name          String
  workflowData  String?  // Your workflow JSON!
  // ... more fields
}

// + SLATimer, SLABreach, SLAEscalation
```

But the Prisma client (the code that accesses the database) needs to be regenerated to "see" these models.

---

## 🔍 Why This Happened

When you first set up the project, `npx prisma generate` was run, but **before** the SLA models were added to the schema. Now that they exist in the schema, the client needs to be regenerated.

---

## ✅ After Running These Steps

1. The Prisma client will include all SLA models
2. The API will be able to access `prisma.sLAPolicy` and `prisma.sLAWorkflow`
3. **Saving workflows will work!** ✨

---

## 🚀 Quick Commands (Copy-Paste)

```bash
# Stop dev server (Ctrl+C), then run:

npx prisma generate

# Wait for success message, then:

npm run dev
```

---

## 📝 Expected Output

When you run `npx prisma generate`, you should see:

```
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.x.x) to .\node_modules\@prisma\client in 234ms

Start using Prisma Client in Node.js (See: https://pris.ly/d/client)

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

---

## 🎉 Test It!

After restarting the dev server:

1. Open workflow builder
2. Create a simple workflow
3. Click **"Save Draft"**
4. Should work! ✅

---

## 🔄 Optional: Create the Database Tables

If you also need to create the SLA tables in the database (first time setup):

```bash
npx prisma migrate dev --name add_sla_tables
```

But if the tables already exist, just `npx prisma generate` is enough!

---

**TL;DR:** Stop server → `npx prisma generate` → Start server → Save workflows now works! 🚀

