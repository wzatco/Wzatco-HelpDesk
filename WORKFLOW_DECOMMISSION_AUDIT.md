# Workflow System Decommission Audit Report

**Date:** January 2025  
**Auditor:** System Architecture Analysis  
**Scope:** Complete dependency mapping for safe removal of Workflow Builder and Execution Engine

---

## 📋 Executive Summary

The workflow system consists of:
- **Execution Engine:** `lib/workflow-executor.js`
- **Trigger System:** `lib/workflow-triggers.js`
- **UI Components:** `pages/admin/sla/workflows/`
- **API Routes:** `pages/api/admin/sla/workflows/`
- **Database Model:** `SLAWorkflow` (linked to `SLAPolicy`)

**Critical Finding:** The workflow system is **actively integrated** into core ticket operations. Removing it without unlinking will cause **runtime errors** in production.

---

## 1. Critical Dependencies (Must Unlink First)

These are the **most dangerous** connections. If you delete the workflow files but leave these calls, the application **will crash** when these endpoints are hit.

### 1.1 Ticket Creation Hook
**File:** `pages/api/admin/tickets/index.js`  
**Lines:** 1419-1426

```javascript
// Trigger workflow on ticket creation
try {
  const { WorkflowTriggers } = await import('../../../../lib/workflow-triggers');
  await WorkflowTriggers.onTicketCreated(conversation);
} catch (workflowError) {
  // Log error but don't fail ticket creation if workflow trigger fails
  console.error('Error triggering workflows:', workflowError);
}
```

**Impact:** ⚠️ **CRITICAL** - Called on every ticket creation  
**Action Required:** Remove the entire try-catch block (lines 1419-1426)

---

### 1.2 Ticket Assignment Change Hooks
**File:** `pages/api/admin/tickets/[id].js`  
**Three locations:**

#### Location 1: Assignment (Lines 570-581)
```javascript
// Trigger workflow for assignment change
try {
  const { WorkflowTriggers } = await import('../../../../lib/workflow-triggers');
  await WorkflowTriggers.onAssignmentChanged(
    currentTicket,
    currentTicket.assigneeId,
    assigneeId
  );
} catch (workflowError) {
  console.error('Error triggering assignment workflow:', workflowError);
  // Don't fail the request if workflow trigger fails
}
```

#### Location 2: Unassignment (Lines 592-603)
```javascript
// Trigger workflow for unassignment
try {
  const { WorkflowTriggers } = await import('../../../../lib/workflow-triggers');
  await WorkflowTriggers.onAssignmentChanged(
    currentTicket,
    currentTicket.assigneeId,
    null
  );
} catch (workflowError) {
  console.error('Error triggering unassignment workflow:', workflowError);
  // Don't fail the request if workflow trigger fails
}
```

#### Location 3: Reassignment (Lines 661-672)
```javascript
// Trigger workflow for reassignment
try {
  const { WorkflowTriggers } = await import('../../../../lib/workflow-triggers');
  await WorkflowTriggers.onAssignmentChanged(
    currentTicket,
    currentTicket.assigneeId,
    assigneeId
  );
} catch (workflowError) {
  console.error('Error triggering reassignment workflow:', workflowError);
  // Don't fail the request if workflow trigger fails
}
```

**Impact:** ⚠️ **CRITICAL** - Called on every ticket assignment/unassignment/reassignment  
**Action Required:** Remove all three try-catch blocks

---

### 1.3 First Response Hook
**File:** `pages/api/admin/tickets/[id]/messages.js`  
**Lines:** 199-206

```javascript
// Trigger workflow for first response
try {
  const { WorkflowTriggers } = await import('../../../../../lib/workflow-triggers');
  await WorkflowTriggers.onFirstResponse(conversation);
} catch (workflowError) {
  console.error('Error triggering first response workflow:', workflowError);
  // Don't fail message creation if workflow trigger fails
}
```

**Impact:** ⚠️ **CRITICAL** - Called when first agent message is sent  
**Action Required:** Remove the entire try-catch block (lines 199-206)

---

## 2. UI Dependencies (Non-Critical)

These are UI links that will result in 404 errors but won't crash the app.

### 2.1 Policy Page Link to Workflow Builder
**File:** `pages/admin/sla/policies/index.js`  
**Line:** 241

```javascript
<Link href={`/admin/sla/workflows/builder?policyId=${policy.id}`} className="flex-1">
  <button className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium">
    <ArrowRight className="w-4 h-4" />
    Workflows
  </button>
</Link>
```

**Impact:** ⚠️ **LOW** - Link will 404, but won't crash  
**Action Required:** Remove the entire `<Link>` block (lines 241-245)

---

## 3. Files Safe to Delete

Once the critical dependencies above are removed, these files can be safely deleted:

### 3.1 Core Workflow Engine Files
- ✅ `lib/workflow-executor.js` - Main execution engine
- ✅ `lib/workflow-triggers.js` - Trigger system

### 3.2 UI Components
- ✅ `pages/admin/sla/workflows/builder.js` - Workflow builder UI
- ✅ `pages/admin/sla/workflows/index.js` - Workflow list UI

### 3.3 API Routes
- ✅ `pages/api/admin/sla/workflows/index.js` - Workflow CRUD API
- ✅ `pages/api/admin/sla/workflows/[id].js` - Single workflow API

### 3.4 Test Files
- ✅ `__tests__/workflow-nodes.test.js` - Unit tests for workflow nodes

**Total Files to Delete:** 7 files

---

## 4. Database Impact

### 4.1 Prisma Schema Changes

**File:** `prisma/schema.prisma`

#### Model to Remove
**Lines:** 737-753 - `SLAWorkflow` model
```prisma
model SLAWorkflow {
  id           String    @id @default(cuid())
  policyId     String
  name         String
  description  String?
  version      Int       @default(1)
  isActive     Boolean   @default(false)
  isDraft      Boolean   @default(true)
  workflowData String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  publishedAt  DateTime?
  policy       SLAPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@index([policyId])
  @@index([isActive])
}
```

#### Relation to Remove
**File:** `prisma/schema.prisma`  
**Line:** 731 - Remove from `SLAPolicy` model

**Current:**
```prisma
model SLAPolicy {
  // ... other fields ...
  timers               SLATimer[]
  workflows            SLAWorkflow[]  // ← REMOVE THIS LINE
}
```

**After Removal:**
```prisma
model SLAPolicy {
  // ... other fields ...
  timers               SLATimer[]
  // workflows relation removed
}
```

### 4.2 Migration Required

After schema changes, you must:
1. Create a new Prisma migration to drop the `SLAWorkflow` table
2. Remove the foreign key constraint from `SLAPolicy`
3. Run the migration: `npx prisma migrate dev --name remove_workflow_system`

**⚠️ WARNING:** This will **permanently delete** all workflow data in the database. Ensure you have backups if needed.

### 4.3 Database Queries to Check Before Deletion

Run these queries to see what data will be lost:

```sql
-- Count workflows
SELECT COUNT(*) FROM SLAWorkflow;

-- List all workflows
SELECT id, name, policyId, isActive, isDraft FROM SLAWorkflow;

-- Count active workflows
SELECT COUNT(*) FROM SLAWorkflow WHERE isActive = true;
```

---

## 5. Additional References (Non-Critical)

These files reference workflows but are **documentation/scripts only**. They won't cause runtime errors:

### 5.1 Documentation Files (Can Ignore)
- `WORKFLOW_VERIFICATION_REPORT.md`
- `WORKFLOW_NODE_IMPLEMENTATION_REPORT.md`
- `WORKFLOW_NODE_AUDIT.md`
- `WORKFLOW_COMPLETION_SUMMARY.md`
- `WORKFLOW_QUICK_START.md`
- `WORKFLOW_SYSTEM_README.md`
- `SLA_WORKFLOW_SYSTEM.md`
- `SLA_WORKFLOW_LEAVE_ANALYSIS.md`
- `examples/workflow-integration-example.js`

### 5.2 Utility Scripts (May Reference Workflows)
- `pages/api/admin/check-db.js` - Line 20: Counts `sLAWorkflow` (can be removed)
- `pages/api/admin/sla/stats.js` - Line 36: Groups by `sLAWorkflow` (can be removed)

**Impact:** ⚠️ **LOW** - These are utility endpoints, not core functionality

---

## 6. Action Plan: Step-by-Step Removal Checklist

### Phase 1: Unlink Core Dependencies (CRITICAL - DO FIRST)

- [ ] **Step 1.1:** Remove workflow trigger from ticket creation
  - File: `pages/api/admin/tickets/index.js`
  - Remove lines: 1419-1426
  - Test: Create a new ticket, verify no errors

- [ ] **Step 1.2:** Remove workflow triggers from ticket assignment
  - File: `pages/api/admin/tickets/[id].js`
  - Remove lines: 570-581 (assignment)
  - Remove lines: 592-603 (unassignment)
  - Remove lines: 661-672 (reassignment)
  - Test: Assign/unassign/reassign tickets, verify no errors

- [ ] **Step 1.3:** Remove workflow trigger from first response
  - File: `pages/api/admin/tickets/[id]/messages.js`
  - Remove lines: 199-206
  - Test: Send first message to a ticket, verify no errors

### Phase 2: Remove UI Links (NON-CRITICAL)

- [ ] **Step 2.1:** Remove workflow builder link from policies page
  - File: `pages/admin/sla/policies/index.js`
  - Remove lines: 241-245
  - Test: Visit policies page, verify no broken links

### Phase 3: Delete Workflow Files

- [ ] **Step 3.1:** Delete core workflow engine
  - Delete: `lib/workflow-executor.js`
  - Delete: `lib/workflow-triggers.js`

- [ ] **Step 3.2:** Delete workflow UI components
  - Delete: `pages/admin/sla/workflows/builder.js`
  - Delete: `pages/admin/sla/workflows/index.js`

- [ ] **Step 3.3:** Delete workflow API routes
  - Delete: `pages/api/admin/sla/workflows/index.js`
  - Delete: `pages/api/admin/sla/workflows/[id].js`

- [ ] **Step 3.4:** Delete workflow tests
  - Delete: `__tests__/workflow-nodes.test.js`

### Phase 4: Database Cleanup

- [ ] **Step 4.1:** Backup database (if workflow data is needed)

- [ ] **Step 4.2:** Update Prisma schema
  - File: `prisma/schema.prisma`
  - Remove `SLAWorkflow` model (lines 737-753)
  - Remove `workflows SLAWorkflow[]` from `SLAPolicy` (line 731)

- [ ] **Step 4.3:** Generate and run migration
  ```bash
  npx prisma migrate dev --name remove_workflow_system
  ```

- [ ] **Step 4.4:** Regenerate Prisma client
  ```bash
  npx prisma generate
  ```

### Phase 5: Clean Up Utility References (OPTIONAL)

- [ ] **Step 5.1:** Remove workflow references from check-db.js
  - File: `pages/api/admin/check-db.js`
  - Remove line 20: `slaWorkflows: await prisma.sLAWorkflow.count().catch(() => 0),`

- [ ] **Step 5.2:** Remove workflow stats from sla/stats.js
  - File: `pages/api/admin/sla/stats.js`
  - Remove or comment out workflow grouping logic (line 36)

### Phase 6: Verification

- [ ] **Step 6.1:** Test ticket creation (no workflow errors)
- [ ] **Step 6.2:** Test ticket assignment (no workflow errors)
- [ ] **Step 6.3:** Test first response (no workflow errors)
- [ ] **Step 6.4:** Verify no broken imports in console
- [ ] **Step 6.5:** Run full application test suite
- [ ] **Step 6.6:** Check production logs for workflow-related errors

---

## 7. Risk Assessment

### High Risk Areas
1. **Ticket Creation Endpoint** - If workflow trigger is called but file is missing, ticket creation will fail
2. **Ticket Update Endpoint** - Assignment changes will fail if workflow triggers are missing
3. **Message Creation Endpoint** - First response detection will fail if workflow trigger is missing

### Low Risk Areas
1. **UI Links** - Will just 404, won't crash app
2. **Documentation Files** - No runtime impact
3. **Utility Scripts** - Can be fixed later

---

## 8. Rollback Plan

If issues occur after removal:

1. **Immediate Rollback:**
   - Restore deleted files from git
   - Revert Prisma schema changes
   - Run: `npx prisma migrate reset` (⚠️ This will wipe database)

2. **Partial Rollback:**
   - If only some endpoints fail, restore just the workflow files
   - Re-add the try-catch blocks in ticket endpoints
   - Keep database changes (workflows table can be empty)

3. **Database Rollback:**
   - If migration was run, restore from backup
   - Or manually recreate `SLAWorkflow` table from schema

---

## 9. Summary

### Files to Modify (Remove Code)
1. `pages/api/admin/tickets/index.js` - Remove 8 lines
2. `pages/api/admin/tickets/[id].js` - Remove 3 blocks (~36 lines)
3. `pages/api/admin/tickets/[id]/messages.js` - Remove 8 lines
4. `pages/admin/sla/policies/index.js` - Remove 5 lines
5. `prisma/schema.prisma` - Remove 1 relation + 1 model (~20 lines)

### Files to Delete
1. `lib/workflow-executor.js`
2. `lib/workflow-triggers.js`
3. `pages/admin/sla/workflows/builder.js`
4. `pages/admin/sla/workflows/index.js`
5. `pages/api/admin/sla/workflows/index.js`
6. `pages/api/admin/sla/workflows/[id].js`
7. `__tests__/workflow-nodes.test.js`

### Database Changes
- Remove `SLAWorkflow` table
- Remove `workflows` relation from `SLAPolicy`

### Estimated Time
- **Phase 1-2 (Unlinking):** 15-30 minutes
- **Phase 3 (Deletion):** 5 minutes
- **Phase 4 (Database):** 10-15 minutes
- **Phase 5-6 (Cleanup & Testing):** 30-60 minutes

**Total:** ~1-2 hours

---

## ✅ Conclusion

The workflow system is **deeply integrated** into core ticket operations. However, all integrations use **try-catch blocks**, which means they're designed to fail gracefully. This makes removal safer, but you **must** remove the try-catch blocks themselves to prevent import errors.

**Priority Order:**
1. **CRITICAL:** Remove workflow triggers from ticket endpoints (Phase 1)
2. **IMPORTANT:** Remove UI links (Phase 2)
3. **SAFE:** Delete workflow files (Phase 3)
4. **REQUIRED:** Database cleanup (Phase 4)

**⚠️ DO NOT DELETE FILES UNTIL PHASE 1 IS COMPLETE**

---

**End of Audit Report**

