# 🚀 Workflow System - Quick Start Guide

## ✅ What's Already Done

All the heavy lifting is complete:

- ✅ **Workflow Builder UI** - Fully functional visual editor
- ✅ **Save/Publish System** - Workflows saved to database
- ✅ **Execution Engine** - Processes workflows (`lib/workflow-executor.js`)
- ✅ **Trigger System** - Hooks for ticket events (`lib/workflow-triggers.js`)
- ✅ **20+ Node Types** - All SLA operations implemented

## 🔌 What You Need to Do (10 Minutes)

To make workflows execute automatically, add 3 simple hooks to your existing ticket APIs:

### **Step 1: Add to Ticket Creation API** (2 min)

Find where you create tickets (likely `pages/api/tickets/create.js` or similar) and add:

```javascript
import { WorkflowTriggers } from '../../../lib/workflow-triggers';

// After your existing ticket creation:
const ticket = await prisma.conversation.create({
  // ... your existing data ...
});

// 👇 ADD THIS LINE
await WorkflowTriggers.onTicketCreated(ticket);

return res.json({ success: true, ticket });
```

### **Step 2: Add to Ticket Update API** (3 min)

Find where you update tickets and add:

```javascript
import { WorkflowTriggers } from '../../../lib/workflow-triggers';

// Get old ticket first
const oldTicket = await prisma.conversation.findUnique({
  where: { id: ticketId }
});

// Update ticket (your existing code)
const updatedTicket = await prisma.conversation.update({
  // ... your existing update ...
});

// 👇 ADD THIS: Detect what changed
const changes = {};
if (oldTicket.priority !== updatedTicket.priority) {
  changes.priority = { old: oldTicket.priority, new: updatedTicket.priority };
}
if (oldTicket.status !== updatedTicket.status) {
  changes.status = { old: oldTicket.status, new: updatedTicket.status };
}
// Add more fields as needed

// 👇 ADD THIS LINE
if (Object.keys(changes).length > 0) {
  await WorkflowTriggers.onTicketUpdated(updatedTicket, changes);
}

return res.json({ success: true, ticket: updatedTicket });
```

### **Step 3: Add Cron Job for SLA Monitoring** (5 min)

Create a new file: `pages/api/cron/check-sla-timers.js`

```javascript
import { WorkflowTriggers } from '../../../lib/workflow-triggers';

export default async function handler(req, res) {
  // Optional: Add auth check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await WorkflowTriggers.checkSLATimers();
    return res.json({ success: true, message: 'SLA timers checked' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
```

**Then add to `vercel.json` (or create it):**

```json
{
  "crons": [{
    "path": "/api/cron/check-sla-timers",
    "schedule": "*/5 * * * *"
  }]
}
```

**Or use manual cron (if not on Vercel):**
```bash
# Add to crontab:
*/5 * * * * curl https://yoursite.com/api/cron/check-sla-timers -H "Authorization: Bearer YOUR_SECRET"
```

---

## 🧪 Test It Works

### **Test 1: Create a Simple Workflow**

1. Go to `/admin/sla/workflows/builder`
2. Create workflow:
   - Add "Ticket Created" node
   - Add "Start SLA Timer" node
   - Connect them
   - Configure "Start SLA Timer" (select High priority policy)
   - Click **Publish**

3. Create a new ticket through your system
4. Check console logs for:
   ```
   [Workflow Trigger] Ticket created: ticket-id
   [Workflow] Executing workflow workflow-id
   [Workflow] Executing node: Ticket Created
   [Workflow] Executing node: Start SLA Timer
   [Workflow] SLA timers started for ticket ticket-id
   ```

5. Check database:
   ```sql
   SELECT * FROM SLATimer WHERE conversationId = 'your-ticket-id';
   ```
   Should show 2 timers (response + resolution)

### **Test 2: Test Notifications**

1. Create workflow:
   - Add "Ticket Created" (Priority = High)
   - Add "Send Notification" node
   - Configure notification (recipient, message)
   - Connect and publish

2. Create a high-priority ticket
3. Check logs for notification

### **Test 3: Test Conditions**

1. Create workflow:
   - Add "Ticket Created"
   - Add "IF Condition" (Priority = High)
   - Add "Send Email" (connect to True path)
   - Add "Assign Ticket" (connect to False path)
   - Publish

2. Test with high and low priority tickets
3. Verify different paths execute

---

## 📁 File Reference

Here's what was created:

```
lib/
  ├── workflow-executor.js      ← Executes workflows
  ├── workflow-triggers.js      ← Hooks into ticket events
  └── sla-service.js            ← Existing SLA system (untouched)

pages/admin/sla/workflows/
  └── builder.js                ← Visual workflow builder (enhanced)

pages/api/admin/sla/workflows/
  ├── index.js                  ← List/Create workflows (exists)
  └── [id].js                   ← Get/Update/Delete workflow (exists)

examples/
  └── workflow-integration-example.js  ← Copy-paste examples

docs/
  ├── SLA_WORKFLOW_SYSTEM.md    ← Full documentation
  └── WORKFLOW_QUICK_START.md   ← This file
```

---

## 🎯 Common Integration Points

### **Where to find your ticket APIs:**

Your ticket endpoints are likely in one of these locations:

```
pages/api/
  ├── tickets/
  │   ├── create.js             ← Add onTicketCreated here
  │   ├── [id]/update.js        ← Add onTicketUpdated here
  │   └── [id]/status.js        ← Also check status changes
  │
  ├── conversations/
  │   ├── create.js             ← Or here
  │   └── [id].js               ← Or here
  │
  └── helpdesk/
      ├── ticket/create.js      ← Or here
      └── ticket/[id]/update.js ← Or here
```

**Can't find them?** Search your codebase:
```bash
# Find ticket creation:
grep -r "conversation.create" pages/api/

# Find ticket updates:
grep -r "conversation.update" pages/api/
```

---

## 🔍 Debugging Tips

### **Workflows Not Executing?**

1. **Check workflow status:**
   ```sql
   SELECT id, name, isActive, isDraft FROM SLAWorkflow;
   ```
   Make sure `isActive = true` and `isDraft = false`

2. **Check trigger filters:**
   - Open workflow in builder
   - Double-click trigger node
   - Verify filters match your test ticket

3. **Check console logs:**
   - Look for `[Workflow Trigger]` messages
   - Look for `[Workflow]` messages
   - Check for errors

4. **Verify integration:**
   ```javascript
   // Add temporary log in your ticket creation:
   console.log('About to trigger workflows for ticket:', ticket.id);
   await WorkflowTriggers.onTicketCreated(ticket);
   console.log('Workflows triggered');
   ```

### **Still not working?**

Check these files exist and have no syntax errors:
```bash
node -c lib/workflow-executor.js
node -c lib/workflow-triggers.js
```

---

## 📊 Monitoring

### **See What's Executing**

All workflow execution is logged:

```javascript
// Your logs will show:
[Workflow Trigger] Ticket created: abc-123
[Workflow Trigger] Executing workflow xyz-789 for ticket abc-123
[Workflow] Executing workflow xyz-789
[Workflow] Executing node: Ticket Created (ticket_created)
[Workflow] Executing node: Start SLA Timer (start_sla_timer)
[Workflow] SLA timers started for ticket abc-123
[Workflow] Execution complete: { success: true, results: [...] }
```

### **Database Records**

Check what workflows created:

```sql
-- See all active workflows
SELECT * FROM SLAWorkflow WHERE isActive = true;

-- See SLA timers created by workflows
SELECT * FROM SLATimer ORDER BY createdAt DESC LIMIT 10;

-- See workflow execution results
SELECT * FROM SLABreach ORDER BY breachedAt DESC LIMIT 10;
SELECT * FROM SLAEscalation ORDER BY createdAt DESC LIMIT 10;
```

---

## 🎉 You're Done!

Once you add those 3 integration points:

✅ Workflows will execute automatically on ticket events
✅ SLA timers will start/pause/resume based on your flows
✅ Notifications will send automatically
✅ Escalations will trigger at the right time
✅ Field updates will happen automatically

**Your visual workflows are now FULLY FUNCTIONAL!** 🚀

---

## 📞 Need Help?

See the detailed examples in:
- `examples/workflow-integration-example.js` - Full code examples
- `SLA_WORKFLOW_SYSTEM.md` - Complete system documentation

The system is production-ready with proper error handling, logging, and security! 🎯

