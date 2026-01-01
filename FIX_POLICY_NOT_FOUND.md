# 🔧 Fix: "Policy not found" Error - Complete Solution

## ❌ The Problem

```
Policy not found
```

When trying to save a workflow, the system can't find any SLA policies in the database.

---

## ✅ The Solution - 3 Easy Methods

### **Method 1: Use the Seed Page** (⭐ EASIEST!)

1. **Open this URL in your browser:**
   ```
   http://localhost:3000/seed-sla.html
   ```

2. **Click the "Create Policies" button**

3. **Done!** ✅

---

### **Method 2: Browser Console** (Quick!)

1. Open your browser console (Press `F12`)
2. Paste this code:
   ```javascript
   fetch('/api/admin/sla/seed-policies', { method: 'POST' })
     .then(r => r.json())
     .then(data => {
       console.log('✅ Success!', data);
       alert('SLA Policies created!');
     });
   ```
3. Press `Enter`
4. Wait for success message

---

### **Method 3: Command Line** (Traditional)

```bash
node prisma/seed-sla.js
```

---

## 🎯 What Gets Created

### **3 Ready-to-Use SLA Policies:**

#### **1. Standard Support SLA (Default)** ✅
- **ID:** `default-policy`
- **Low Priority:** 8h response / 48h resolution
- **Medium Priority:** 4h response / 24h resolution  
- **High Priority:** 1h response / 8h resolution
- **Urgent Priority:** 15min response / 4h resolution
- **Business Hours:** Mon-Sat (9 AM - 6 PM, Sat 10 AM - 2 PM)
- **Escalation:** 80% warning / 95% critical

#### **2. High Priority SLA** 🚨
- **ID:** `high-priority-sla`
- **More aggressive timers** (faster response)
- **24/7 Support** (no pause for nights/weekends)
- **Urgent:** 10 minutes response!
- **Escalation:** 70% warning / 90% critical

#### **3. Basic SLA** 📝
- **ID:** `basic-sla`
- **Relaxed timers** (more time to respond)
- **Low Priority:** 24h response / 5 days resolution
- For general inquiries and FAQs

---

## 🚀 Step-by-Step Fix

### **Using the Seed Page (Recommended):**

1. **Make sure dev server is running:**
   ```bash
   npm run dev
   ```

2. **Open the seed page:**
   - Go to: `http://localhost:3000/seed-sla.html`
   - You'll see a beautiful purple page with a button

3. **Click "Create Policies" button**
   - Wait ~2 seconds
   - See success message with created policies

4. **Test the fix:**
   - Go back to workflow builder
   - Create a workflow
   - Click "Save Draft"
   - **Should work!** ✅

---

## 📊 Before vs After

### **Before:**
```
❌ POST /api/admin/sla/workflows → 500
❌ Error: Policy not found
❌ Cannot save workflows
```

### **After:**
```
✅ 3 SLA Policies exist in database
✅ POST /api/admin/sla/workflows → 201
✅ Workflow saved successfully!
```

---

## 🎯 Test It!

After creating policies:

1. **Open workflow builder**
   ```
   http://localhost:3000/admin/sla/workflows/builder
   ```

2. **Create a simple workflow:**
   - Drag "Ticket Created" from left panel
   - Double-click to configure
   - Name it "Test Workflow"

3. **Click "Save Draft"**
   - Should see: "Workflow saved successfully!" ✅
   - Should redirect to workflows list

4. **Verify:**
   - Go to `/admin/sla` 
   - Your workflow should be listed!

---

## 📁 Files Created

Here's what was added to fix this:

1. **`prisma/seed-sla.js`**
   - Node.js script to seed policies
   - Run with: `node prisma/seed-sla.js`

2. **`pages/api/admin/sla/seed-policies.js`**
   - API endpoint for seeding
   - Call with: `POST /api/admin/sla/seed-policies`

3. **`public/seed-sla.html`**
   - Beautiful UI for one-click seeding
   - Open at: `http://localhost:3000/seed-sla.html`

---

## 🔍 Why This Happened

The workflow builder code expects a policy:

```javascript
// pages/admin/sla/workflows/builder.js
const payload = {
  policyId: router.query.policyId || 'default-policy',
  // ...
};
```

The API then checks if it exists:

```javascript
// pages/api/admin/sla/workflows/index.js
const policy = await prisma.sLAPolicy.findUnique({
  where: { id: policyId },
});

if (!policy) {
  return res.status(404).json({ message: 'Policy not found' });
}
```

**Solution:** Create the policies! ✅

---

## ⚠️ Important Notes

- ✅ Safe to run multiple times (uses `upsert`)
- ✅ Won't create duplicates
- ✅ IDs are hardcoded for consistency
- ✅ Policies can be edited later via UI

---

## 🐛 Troubleshooting

### **"Failed to fetch" error:**
- Make sure dev server is running (`npm run dev`)
- Check URL is correct (`localhost:3000`)

### **Database error:**
- Make sure tables exist: `npx prisma db push`
- Check database file exists: `prisma/dev.db`

### **"Module not found":**
- Install dependencies: `npm install @prisma/client`
- Regenerate client: `npx prisma generate`

---

## 🎉 Success Checklist

After running the seed:

- [x] 3 policies created in database
- [x] Can save workflow drafts
- [x] Can publish workflows
- [x] No "Policy not found" errors
- [x] Workflow system fully functional!

---

## 📚 Next Steps

Now that policies exist:

1. **Create workflows** in the visual builder
2. **Assign policies** to different ticket types
3. **Monitor SLA compliance** in reports
4. **Configure escalations** in workflow nodes

---

## 🔗 Quick Links

- **Seed Page:** http://localhost:3000/seed-sla.html
- **Workflow Builder:** http://localhost:3000/admin/sla/workflows/builder
- **SLA Dashboard:** http://localhost:3000/admin/sla
- **Policies List:** http://localhost:3000/admin/sla/policies

---

**TL;DR:** Open `http://localhost:3000/seed-sla.html` → Click button → Policies created → Save workflows now works! 🚀

