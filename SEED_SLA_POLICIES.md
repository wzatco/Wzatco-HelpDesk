# 🌱 Seed SLA Policies - Fix "Policy not found"

## ❌ The Problem

```
Policy not found
```

When saving a workflow, the API checks if the policy exists, but there are **no policies in the database yet**!

---

## ✅ The Solution (2 Methods)

### **Method 1: Using API Endpoint** (Easiest! ⭐)

1. **Open this URL in your browser:**
   ```
   http://localhost:3000/api/admin/sla/seed-policies
   ```

2. **Use POST method** (you can use browser console):
   ```javascript
   fetch('/api/admin/sla/seed-policies', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```

3. **Or use this simple button:** See below! 👇

---

### **Method 2: Run Seed Script**

```bash
node prisma/seed-sla.js
```

---

## 🚀 Quick Fix - Browser Console

**Easiest way!** Open browser console (F12) and paste:

```javascript
fetch('/api/admin/sla/seed-policies', { 
  method: 'POST' 
})
.then(r => r.json())
.then(data => {
  console.log('✅ Success!', data);
  alert('SLA Policies created successfully!');
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Failed to create policies');
});
```

Then press Enter! ✅

---

## 🎯 What This Creates

### **3 SLA Policies:**

#### **1. Standard Support SLA (Default)** ✅
- ID: `default-policy`
- **Low Priority:** 8h response / 48h resolution
- **Medium Priority:** 4h response / 24h resolution
- **High Priority:** 1h response / 8h resolution
- **Urgent Priority:** 15min response / 4h resolution
- Business hours: Mon-Sat (9-6, Sat 10-2)

#### **2. High Priority SLA** 🚨
- ID: `high-priority-sla`
- **More aggressive timers** (faster response times)
- **24/7 support** (no business hours)
- **Stricter escalation** (70% / 90%)

#### **3. Basic SLA** 📝
- ID: `basic-sla`
- **Relaxed timers** (more time to respond)
- Business hours only
- For general inquiries

---

## 📝 Expected Output

```bash
$ node prisma/seed-sla.js

🌱 Seeding SLA Policies...
✅ Created default policy: Standard Support SLA
✅ Created high priority policy: High Priority SLA
✅ Created basic policy: Basic SLA

🎉 SLA Policies seeded successfully!

Policies created:
  1. Standard Support SLA (default)
  2. High Priority SLA
  3. Basic SLA
```

---

## 🚀 After Running

1. ✅ Three policies exist in database
2. ✅ Workflow builder can save to `default-policy`
3. ✅ **"Save Draft" will work!** 🎉

---

## 🎯 Test It!

1. **Run:** `node prisma/seed-sla.js`
2. **Open workflow builder**
3. **Create a workflow**
4. **Click "Save Draft"**
5. **Should see:** "Workflow saved successfully!" ✅

---

## 📖 View Created Policies

After seeding, you can view them:

### **In Admin Panel:**
Go to: `/admin/sla/policies`

### **In Database:**
```bash
npx prisma studio
```

Then browse to `SLAPolicy` table

---

## 🔍 Why This Happened

The workflow builder code expects a `policyId`:

```javascript
// pages/admin/sla/workflows/builder.js (line 516)
policyId: router.query.policyId || 'default-policy'
```

It tries to use `default-policy`, but that policy didn't exist yet!

The seed script creates it. ✅

---

## 🛠️ Advanced: Custom Policies

You can also create policies through the UI:

1. Go to `/admin/sla/policies`
2. Click "Create New Policy"
3. Fill in response/resolution times
4. Save!

Then use that policy ID when creating workflows.

---

## ⚠️ Important Notes

- The seed script uses `upsert` (won't create duplicates)
- Safe to run multiple times
- IDs are hardcoded (`default-policy`, etc.) for consistency
- Business hours are in 24h format (e.g., "09:00", "18:00")

---

## 🐛 If You Get Errors

### **Error: "Cannot find module '@prisma/client'"**
```bash
npm install @prisma/client
node prisma/seed-sla.js
```

### **Error: "Cannot connect to database"**
Make sure your database file exists:
```bash
npx prisma db push
node prisma/seed-sla.js
```

---

## 📊 Policy Time Examples

**Standard Support SLA:**
- Low (General question): 8 hours → 2 days
- Medium (Bug report): 4 hours → 1 day
- High (Service down): 1 hour → 8 hours
- Urgent (Critical outage): 15 minutes → 4 hours

**High Priority SLA (Aggressive):**
- Urgent: 10 minutes → 2 hours 🔥
- 24/7 monitoring ⏰
- No pause on nights/weekends

**Basic SLA (Relaxed):**
- Low: 24 hours → 5 days
- For FAQs and general inquiries

---

**TL;DR:** Run `node prisma/seed-sla.js` → Policies created → Save workflows now works! 🚀

