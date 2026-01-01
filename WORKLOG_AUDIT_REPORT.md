# 🔍 Worklog Schema Migration Audit Report

## Executive Summary
The `Worklog` model has been migrated from a single-row system to a **Session-Based** model (multiple rows per ticket). This audit identifies all files that need refactoring to support the new schema.

---

## 🚨 CRITICAL ISSUES (Schema Mismatch)

### 1. **lib/utils/tat.js**
**Function:** `calculateAgentTAT(prisma, conversationId)`
**Issue:** Uses `conversationId` field which doesn't exist in new schema. Should use `ticketNumber`.
**Code Block:**
```javascript
const worklogs = await prisma.worklog.findMany({
  where: { conversationId },  // ❌ WRONG: Field doesn't exist
  select: {
    durationSeconds: true,
    startedAt: true,
    endedAt: true
  }
});
```
**Fix Required:** Change `where: { conversationId }` to `where: { ticketNumber: conversationId }`
**Status:** ✅ Logic is correct (sums multiple rows), just wrong field name

---

### 2. **pages/api/admin/worklogs/index.js**
**Function:** `handler` (GET method)
**Issue:** 
- Uses `conversationId` in where clause (line 14) - should be `ticketNumber`
- Uses old relation names (`Agent`, `Conversation`) - should be (`agent`, `ticket`)
**Code Block:**
```javascript
if (conversationId) {
  where.conversationId = conversationId;  // ❌ WRONG: Field doesn't exist
}
// ...
include: {
  Agent: { ... },  // ❌ WRONG: Should be 'agent'
  Conversation: { ... }  // ❌ WRONG: Should be 'ticket'
}
```
**Fix Required:** 
- Change `where.conversationId` to `where.ticketNumber`
- Change relation names from `Agent`/`Conversation` to `agent`/`ticket`

---

### 3. **pages/api/admin/worklogs/index.js**
**Function:** `handler` (POST method)
**Issue:** Uses old schema fields that don't exist:
- `conversationId` → should be `ticketNumber`
- `source` → field removed from schema
- `description` → field removed from schema
**Code Block:**
```javascript
const { conversationId, agentId, startedAt, endedAt, description, source = 'manual' } = req.body;
// ...
const worklog = await prisma.worklog.create({
  data: {
    conversationId,  // ❌ WRONG: Should be ticketNumber
    agentId,
    startedAt: startTime,
    endedAt: endTime,
    durationSeconds,
    source,  // ❌ WRONG: Field doesn't exist
    description: description || null  // ❌ WRONG: Field doesn't exist
  }
});
```
**Fix Required:** 
- Replace `conversationId` with `ticketNumber`
- Remove `source` field
- Remove `description` field
- Update `updateTATMetrics` call to use `ticketNumber`

---

### 4. **pages/api/admin/worklogs/[id].js**
**Function:** `handler` (PATCH method)
**Issue:** 
- Uses `description` field which doesn't exist
- Uses `conversationId` when calling `updateTATMetrics` (line 128)
- Uses old relation names (`Agent`, `Conversation`)
**Code Block:**
```javascript
if (description !== undefined) {
  updateData.description = description;  // ❌ WRONG: Field doesn't exist
}
// ...
await updateTATMetrics(prisma, updatedWorklog.conversationId);  // ❌ WRONG: Should be ticketNumber
```
**Fix Required:**
- Remove `description` handling
- Change `updatedWorklog.conversationId` to `updatedWorklog.ticketNumber`
- Update relation names

---

### 5. **pages/api/admin/worklogs/[id].js**
**Function:** `handler` (DELETE method)
**Issue:** Uses `conversationId` when calling `updateTATMetrics` (line 167)
**Code Block:**
```javascript
await updateTATMetrics(prisma, deletedWorklog.conversationId);  // ❌ WRONG: Should be ticketNumber
```
**Fix Required:** Change to `deletedWorklog.ticketNumber`

---

### 6. **pages/admin/agents/[id].js**
**Function:** `fetchAgentWorklogs`
**Issue:** 
- Uses `conversationId` when calculating unique tickets (line 179)
- Uses `source` field which doesn't exist (lines 175-176)
**Code Block:**
```javascript
const uniqueTickets = new Set(worklogs.map(w => w.conversationId)).size;  // ❌ WRONG: Should be ticketNumber
const autoWorklogs = worklogs.filter(w => w.source === 'auto').length;  // ❌ WRONG: Field doesn't exist
const manualWorklogs = worklogs.filter(w => w.source === 'manual').length;  // ❌ WRONG: Field doesn't exist
```
**Fix Required:**
- Change `w.conversationId` to `w.ticketNumber`
- Remove `source` filtering (or use `isSystemAuto` field instead)

---

### 7. **pages/admin/tickets/[id].js**
**Function:** Worklog display section
**Issue:** 
- Uses old relation name `Agent` (should be `agent`)
- Uses `source` field which doesn't exist (line 4214)
- Uses old worklog structure
**Code Block:**
```javascript
{worklog.Agent?.name || 'Agent'}  // ❌ WRONG: Should be worklog.agent
{worklog.source === 'auto' ? 'Auto' : 'Manual'}  // ❌ WRONG: Field doesn't exist
```
**Fix Required:**
- Change `worklog.Agent` to `worklog.agent`
- Remove `source` display (or use `isSystemAuto` field)
- Update to use new session-based display logic

---

## ⚠️ MODERATE ISSUES (Logic May Need Review)

### 8. **pages/api/admin/reports/agents.js**
**Function:** `handler` (Agent Performance Report)
**Issue:** Doesn't use worklogs at all - calculates resolution time from ticket timestamps only. May want to add worklog-based metrics.
**Status:** ⚠️ Not broken, but missing worklog-based metrics

---

### 9. **pages/api/admin/reports/tat.js**
**Function:** `handler` (TAT Reports)
**Issue:** Doesn't use worklogs - calculates resolution time from ticket creation/resolution timestamps only.
**Status:** ⚠️ Not broken, but may want to show agent TAT (worklog-based) vs total resolution time

---

### 10. **pages/api/admin/reports/sla.js**
**Function:** `handler` (SLA Reports)
**Issue:** Doesn't use worklogs - calculates times from ticket/message timestamps.
**Status:** ⚠️ Not broken, but SLA calculations may want to consider actual agent work time

---

## ✅ CORRECT IMPLEMENTATIONS

### 11. **pages/api/agent/worklogs/index.js**
**Status:** ✅ Already updated for new schema
- Uses `ticketNumber` correctly
- Uses `agent` relation correctly
- Sums multiple rows correctly

### 12. **pages/api/agent/worklogs/start.js**
**Status:** ✅ Already updated for new schema

### 13. **pages/api/agent/worklogs/stop.js**
**Status:** ✅ Already updated for new schema

---

## 📋 Summary

**Total Files Requiring Fixes:** 7
- **Critical (Schema Mismatch):** 7 files
- **Moderate (Logic Review):** 3 files
- **Already Correct:** 3 files

**Priority Order:**
1. `lib/utils/tat.js` - Core TAT calculation (used by many endpoints)
2. `pages/api/admin/worklogs/index.js` - Admin worklog API (GET & POST)
3. `pages/api/admin/worklogs/[id].js` - Admin worklog detail API
4. `pages/admin/agents/[id].js` - Agent profile page
5. `pages/admin/tickets/[id].js` - Admin ticket view page

---

## 🔧 Recommended Fix Strategy

1. **Fix TAT calculation first** (`lib/utils/tat.js`) - This is used by many other endpoints
2. **Fix Admin Worklog APIs** - These are likely used by admin panel
3. **Fix Frontend displays** - Update UI to match new schema
4. **Consider adding worklog metrics** to reports that currently only use ticket timestamps

