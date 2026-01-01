# SLA & Workflow Engine Analysis for Leave Management

**Date:** January 2025  
**Purpose:** Analyze impact of implementing "Leave Management" system where tickets assigned to agents on leave become "Claimable" (unassigned).

---

## 📊 Executive Summary

### ✅ **SAFE TO IMPLEMENT** with minor modifications

**Key Findings:**
1. **SLA Timers:** ✅ **SAFE** - Timers are tied to `conversationId`, not `assigneeId`. Unassigning does NOT pause timers.
2. **First Response Time:** ✅ **SAFE** - Tracked via `firstResponseAt` field, not tied to specific agent ID.
3. **Workflow Triggers:** ⚠️ **REQUIRES MODIFICATION** - Unassigning WILL trigger `ticket_updated` workflows if they watch the `assignee` field.
4. **Notifications:** ⚠️ **REQUIRES MODIFICATION** - SLA escalation notifications check for `assigneeId` and skip if null.

---

## 🔍 Detailed Analysis

### 1. Database Schema (`prisma/schema.prisma`)

#### **Ticket Model (`Conversation`)**
```prisma
model Conversation {
  ticketNumber             String            @id
  assigneeId               String?           // ← Can be NULL (already supports unassigned)
  firstResponseAt          DateTime?         // ← Not tied to agent ID
  firstResponseTimeSeconds Int?              // ← Calculated from creation
  // ... other fields
}
```

**Key Fields:**
- `assigneeId` is **already nullable** (`String?`) - ✅ No schema change needed
- `firstResponseAt` is **not tied to agent ID** - ✅ Safe to unassign
- No `isClaimable` flag exists - ⚠️ **May need to add** for UI filtering

#### **SLA Timer Model (`SLATimer`)**
```prisma
model SLATimer {
  id               String      @id
  conversationId   String      // ← Tied to ticket, NOT agent
  timerType        String      // 'response' or 'resolution'
  status           String      // 'running', 'paused', 'breached', 'stopped'
  // ... no assigneeId field
}
```

**Key Finding:** SLA timers are **completely independent** of `assigneeId`. They track ticket-level metrics, not agent-specific metrics.

#### **SLA Breach Model (`SLABreach`)**
```prisma
model SLABreach {
  assignedTo        String?     // ← Stores assigneeId at time of breach (for reporting)
  // ... not used for timer logic
}
```

**Key Finding:** `assignedTo` in breach records is for **reporting purposes only**, not for timer logic.

---

### 2. SLA Calculation Logic

#### **File:** `lib/sla-service.js`

**How SLA Timers Work:**
1. **Timer Creation:** Timers are created when ticket is created, tied to `conversationId`:
   ```javascript
   await prisma.sLATimer.create({
     data: {
       conversationId,  // ← Only ticket ID, no agent ID
       timerType: 'response',
       status: 'running',
       // ...
     }
   });
   ```

2. **Timer Monitoring:** Timers continue running regardless of assignment:
   ```javascript
   static async checkTimer(timer) {
     // Calculates elapsed time from ticket creation
     // NO check for assigneeId
     // NO pause if assigneeId is null
   }
   ```

3. **Timer Pausing:** Only pauses based on **ticket status**, not assignment:
   ```javascript
   static async checkPauseConditions(conversationId, status, policy) {
     const shouldPause = 
       (policy.pauseOnWaiting && status === 'waiting') ||
       (policy.pauseOnHold && status === 'on_hold');
     // ← NO check for assigneeId === null
   }
   ```

**Critical Finding:** ✅ **SLA timers DO NOT pause when `assigneeId` becomes null.** They continue running based on ticket creation time.

#### **First Response Time Tracking**

**File:** `lib/utils/sla-monitor.js` (line 182-320)

```javascript
export async function checkTicketSLARisk(ticketId) {
  const ticket = await prisma.conversation.findUnique({
    where: { ticketNumber: ticketId },
    // ...
  });
  
  // First Response SLA is calculated from ticket.createdAt
  // NOT from assignment time
  // NOT tied to specific agent ID
}
```

**Critical Finding:** ✅ **First Response Time is calculated from ticket creation, not assignment.** Unassigning does NOT reset or pause this timer.

#### **SLA Notifications**

**File:** `lib/sla-service.js` (lines 396-412, 438-453)

```javascript
// Escalation notifications
if (ticket?.assigneeId) {
  await prisma.notification.create({
    data: {
      userId: ticket.assigneeId,  // ← Only sends if assigneeId exists
      // ...
    }
  });
}

// Breach notifications
if (ticket?.assigneeId) {
  await prisma.notification.create({
    data: {
      userId: ticket.assigneeId,  // ← Only sends if assigneeId exists
      // ...
    }
  });
}
```

**Critical Finding:** ⚠️ **SLA notifications are SKIPPED if `assigneeId` is null.** This means:
- Unassigned tickets won't get SLA escalation warnings
- Unassigned tickets won't get breach notifications
- **Solution:** Need to send notifications to department supervisors or admins when ticket is unassigned

---

### 3. Workflow/Automation Triggers

#### **File:** `lib/workflow-triggers.js`

**How Workflows Are Triggered:**

1. **Ticket Created:** `onTicketCreated(ticket)` - ✅ Safe, only fires on creation
2. **Ticket Updated:** `onTicketUpdated(ticket, changes)` - ⚠️ **RISK**

**Ticket Update Trigger Logic:**
```javascript
static async onTicketUpdated(ticket, changes) {
  // Find workflows with ticket_updated trigger
  const workflows = await prisma.sLAWorkflow.findMany({
    where: { isActive: true, isDraft: false }
  });

  for (const workflow of workflows) {
    const config = triggerNode.data.config || {};
    const watchFields = config.watchFields || [];
    
    // Check if watched fields changed
    const hasMatchingChange = watchFields.some(field => 
      changes.hasOwnProperty(field)  // ← If 'assignee' is watched, this triggers
    );
    
    if (hasMatchingChange) {
      // Execute workflow
      await WorkflowExecutor.executeWorkflow(workflow.id, context);
    }
  }
}
```

**Critical Finding:** ⚠️ **If a workflow watches the `assignee` field, unassigning a ticket WILL trigger it.**

**Potential Issues:**
1. **"New Ticket Assigned" Email Workflow:**
   - If workflow sends email when `assignee` changes
   - Unassigning (assigneeId: "agent123" → null) will trigger
   - May send confusing "You have a new ticket" email to the entire team

2. **"Ticket Reassigned" Notification:**
   - Workflow might notify old agent when reassigned
   - Unassigning might trigger this incorrectly

3. **"Auto-Assign to Department" Workflow:**
   - If workflow auto-assigns when ticket becomes unassigned
   - Could create assignment loop

**Solution Required:** Need to add a flag to suppress workflow triggers for leave-related unassignments, or add a `reason` field to distinguish leave unassignments from normal reassignments.

---

### 4. Ticket Update API

#### **File:** `pages/api/admin/tickets/[id].js` (PATCH handler, line 250+)

**Current Assignment Handling:**
```javascript
if (assigneeId !== undefined && assigneeId !== currentTicket.assigneeId) {
  updateData.assigneeId = assigneeId;
  activities.push({
    activityType: 'assigned',
    oldValue: currentTicket.assignee?.name || null,
    newValue: newAssignee?.name || null,
    // ...
  });
  
  // Create notification
  await notifyTicketAssignment(prisma, {
    ticketId: currentTicket.ticketNumber,
    assigneeId: assigneeId,  // ← Will be null if unassigning
    // ...
  });
}
```

**Critical Finding:** ✅ **API already supports setting `assigneeId` to `null`.** No code changes needed for unassignment.

**Activity Logging:** ✅ Creates activity log for assignment changes (including unassignment).

**Notification:** ⚠️ `notifyTicketAssignment` might need modification to handle null assigneeId gracefully.

#### **Claim Ticket API**

**File:** `pages/api/agent/tickets/[id]/claim.js`

**Current Logic:**
```javascript
// Check if ticket is already assigned
if (ticket.assigneeId) {
  return res.status(400).json({ error: 'Ticket is already assigned' });
}

// Assign ticket to agent
const updateData = { assigneeId: agentId };
```

**Critical Finding:** ✅ **Claim mechanism already exists.** Agents can claim unassigned tickets. This will work perfectly for leave management.

---

### 5. Workflow Integration Points

#### **Current Integration:**

**File:** `pages/api/admin/tickets/index.js` (line 1421-1422)
```javascript
const { WorkflowTriggers } = await import('../../../../lib/workflow-triggers');
await WorkflowTriggers.onTicketCreated(conversation);
```

**Critical Finding:** ⚠️ **`onTicketUpdated` is NOT currently called in the admin ticket update API.** This means workflows watching `ticket_updated` are NOT triggered yet. However, if you add this integration in the future, it will trigger on unassignment.

---

## 🎯 Implementation Recommendations

### **Files to Modify:**

#### 1. **Add Leave Management Flag** (Optional but Recommended)
**File:** `prisma/schema.prisma`
```prisma
model Conversation {
  // ... existing fields
  isClaimable Boolean @default(false)  // ← NEW: Flag for UI filtering
  unassignedReason String?              // ← NEW: 'leave', 'manual', 'auto'
  unassignedAt DateTime?                // ← NEW: Track when unassigned
}
```

**Purpose:** 
- `isClaimable`: UI can filter "Available to Claim" tickets
- `unassignedReason`: Distinguish leave unassignments from other types
- `unassignedAt`: Track how long ticket has been unassigned

#### 2. **Modify SLA Notification Logic**
**File:** `lib/sla-service.js`

**Current (lines 396-412, 438-453):**
```javascript
if (ticket?.assigneeId) {
  // Send notification to assigned agent
}
```

**Recommended Change:**
```javascript
if (ticket?.assigneeId) {
  // Send notification to assigned agent
} else {
  // Send notification to department supervisor or admins
  const supervisors = await prisma.agent.findMany({
    where: {
      departmentId: ticket.departmentId,
      role: { hasSuperPower: true }  // Or use a supervisor flag
    }
  });
  
  for (const supervisor of supervisors) {
    await prisma.notification.create({
      data: {
        userId: supervisor.id,
        type: 'sla_risk',
        title: `Unassigned Ticket SLA Risk: ${ticket.ticketNumber}`,
        message: `Ticket ${ticket.ticketNumber} is unassigned and approaching SLA breach`,
        // ...
      }
    });
  }
}
```

#### 3. **Add Workflow Suppression for Leave Unassignments**
**File:** `pages/api/admin/tickets/[id].js` (PATCH handler)

**Recommended Change:**
```javascript
// When unassigning due to leave
if (assigneeId === null && req.body.unassignedReason === 'leave') {
  updateData.assigneeId = null;
  updateData.isClaimable = true;
  updateData.unassignedReason = 'leave';
  updateData.unassignedAt = new Date();
  
  // Create activity log
  activities.push({
    activityType: 'unassigned',
    oldValue: currentTicket.assignee?.name || null,
    newValue: null,
    reason: 'Agent on leave',
    // ...
  });
  
  // ⚠️ DO NOT trigger workflow for leave unassignments
  // Skip WorkflowTriggers.onTicketUpdated() call
} else {
  // Normal assignment change - trigger workflows
  if (Object.keys(changes).length > 0) {
    const { WorkflowTriggers } = await import('../../../../lib/workflow-triggers');
    await WorkflowTriggers.onTicketUpdated(updatedTicket, changes);
  }
}
```

#### 4. **Modify Workflow Trigger Logic** (Alternative Approach)
**File:** `lib/workflow-triggers.js`

**Recommended Change:**
```javascript
static async onTicketUpdated(ticket, changes) {
  // Skip if this is a leave-related unassignment
  if (changes.assignee && 
      changes.assignee.new === null && 
      ticket.unassignedReason === 'leave') {
    console.log(`[Workflow Trigger] Skipping workflow for leave unassignment: ${ticket.ticketNumber}`);
    return { success: true, message: 'Skipped (leave unassignment)' };
  }
  
  // ... rest of workflow trigger logic
}
```

#### 5. **Update Claim API to Clear Leave Flags**
**File:** `pages/api/agent/tickets/[id]/claim.js`

**Recommended Change:**
```javascript
const updateData = {
  assigneeId: agentId,
  isClaimable: false,        // ← Clear claimable flag
  unassignedReason: null,    // ← Clear reason
  unassignedAt: null         // ← Clear timestamp
};
```

---

## 📋 Summary of Findings

### ✅ **SAFE (No Changes Needed):**

1. **SLA Timer Logic:** Timers continue running regardless of assignment
2. **First Response Time:** Not tied to agent ID, safe to unassign
3. **Ticket Update API:** Already supports null `assigneeId`
4. **Claim Mechanism:** Already exists and works for unassigned tickets

### ⚠️ **REQUIRES MODIFICATION:**

1. **SLA Notifications:** Currently skipped for unassigned tickets
   - **Fix:** Send notifications to department supervisors/admins

2. **Workflow Triggers:** Will fire on unassignment if workflows watch `assignee` field
   - **Fix:** Add suppression logic for leave-related unassignments

3. **UI Filtering:** No way to filter "claimable" tickets
   - **Fix:** Add `isClaimable` flag (optional but recommended)

---

## 🚀 Implementation Checklist

### **Phase 1: Core Functionality (Required)**
- [ ] Modify SLA notification logic to notify supervisors when ticket is unassigned
- [ ] Add workflow suppression for leave unassignments (either in API or trigger logic)
- [ ] Test that SLA timers continue running after unassignment
- [ ] Test that workflows don't fire incorrectly on leave unassignment

### **Phase 2: Enhanced Features (Recommended)**
- [ ] Add `isClaimable` flag to schema
- [ ] Add `unassignedReason` and `unassignedAt` fields
- [ ] Update UI to show "Available to Claim" filter
- [ ] Add dashboard widget showing unassigned tickets count

### **Phase 3: Testing**
- [ ] Test unassigning ticket when agent goes on leave
- [ ] Verify SLA timers continue running
- [ ] Verify workflows don't trigger incorrectly
- [ ] Verify supervisors get SLA notifications for unassigned tickets
- [ ] Test claiming unassigned tickets
- [ ] Verify activity logs are created correctly

---

## 🔗 Related Files Reference

### **SLA System:**
- `lib/sla-service.js` - SLA timer management
- `lib/utils/sla-monitor.js` - SLA risk monitoring
- `pages/api/admin/reports/sla.js` - SLA reporting

### **Workflow System:**
- `lib/workflow-triggers.js` - Workflow trigger logic
- `lib/workflow-executor.js` - Workflow execution engine
- `pages/api/admin/tickets/index.js` - Ticket creation (triggers workflows)

### **Ticket Management:**
- `pages/api/admin/tickets/[id].js` - Ticket update API
- `pages/api/agent/tickets/[id]/claim.js` - Claim ticket API
- `pages/api/agent/tickets/[id]/assign.js` - Agent assignment API

### **Database Schema:**
- `prisma/schema.prisma` - All models

---

## ✅ Conclusion

**The Leave Management system can be safely implemented** with the following modifications:

1. **SLA notifications** need to be sent to supervisors when tickets are unassigned
2. **Workflow triggers** need suppression logic for leave-related unassignments
3. **Optional UI enhancements** (isClaimable flag) for better user experience

**No breaking changes to SLA timer logic or First Response Time tracking are required.**

