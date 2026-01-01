# Field Value Audit Report

**Date:** January 2025  
**Auditor:** Data Audit Script  
**Scope:** Status and Priority field values in Conversation (Ticket) model

---

## 1. Schema Analysis

### Status Field
- **Type:** `String` (NOT an Enum)
- **Default Value:** `"open"`
- **Nullable:** No
- **Location:** `prisma/schema.prisma:157`

### Priority Field
- **Type:** `String?` (NOT an Enum, nullable)
- **Default Value:** `"low"`
- **Nullable:** Yes
- **Location:** `prisma/schema.prisma:167`

**Key Finding:** Both fields are **free-form strings**, not enums. This means any value can be stored, which requires careful validation in the automation engine.

---

## 2. Database Values (Actual Data)

### Status Values Found in Database

**Total Tickets Audited:** 24

| Value | Count | Percentage |
|-------|-------|------------|
| `resolved` | 17 | 70.8% |
| `closed` | 7 | 29.2% |

**Unique Status Values:** `["resolved", "closed"]`

**⚠️ DISCREPANCY DETECTED:**
- Schema default: `"open"`
- UI dropdown includes: `open`, `in_progress`, `waiting`, `on_hold`, `resolved`, `closed`
- **Actual database:** Only `resolved` and `closed` found
- **Missing in database:** `open`, `in_progress`, `waiting`, `on_hold`

**Analysis:** The database currently only contains resolved/closed tickets. New tickets would start with `"open"` status (per schema default), but none exist in the current dataset.

---

### Priority Values Found in Database

| Value | Count | Percentage |
|-------|-------|------------|
| `high` | 11 | 45.8% |
| `low` | 8 | 33.3% |
| `urgent` | 3 | 12.5% |
| `medium` | 2 | 8.3% |

**Unique Priority Values:** `["high", "low", "urgent", "medium"]`

**✅ CONSISTENCY:** All priority values in the database match the UI dropdown options.

---

## 3. Code Constants Check

### Hardcoded Values Found

#### Status Values in UI (`pages/admin/automation/builder/[id].js:230-235`)
```javascript
<option value="open">Open</option>
<option value="in_progress">In Progress</option>
<option value="waiting">Waiting</option>
<option value="on_hold">On Hold</option>
<option value="resolved">Resolved</option>
<option value="closed">Closed</option>
```

#### Priority Values in UI (`pages/admin/automation/builder/[id].js:257-260`)
```javascript
<option value="low">Low</option>
<option value="medium">Medium</option>
<option value="high">High</option>
<option value="urgent">Urgent</option>
```

**No constants file found:** No `lib/constants.ts` or `lib/constants.js` exists with centralized field definitions.

---

## 4. Case Consistency Analysis

### Status Values
- ✅ **No case inconsistencies found**
- All status values in database are lowercase: `resolved`, `closed`
- UI uses lowercase values: `open`, `in_progress`, `waiting`, `on_hold`, `resolved`, `closed`

### Priority Values
- ✅ **No case inconsistencies found**
- All priority values in database are lowercase: `high`, `low`, `urgent`, `medium`
- UI uses lowercase values: `low`, `medium`, `high`, `urgent`

---

## 5. Discrepancies & Recommendations

### Critical Discrepancies

1. **Status Values Mismatch**
   - **UI offers:** 6 status values (`open`, `in_progress`, `waiting`, `on_hold`, `resolved`, `closed`)
   - **Database contains:** 2 status values (`resolved`, `closed`)
   - **Schema default:** `open`
   - **Impact:** Automation rules can be created for statuses that may not exist yet, but this is acceptable for future-proofing.

2. **No Centralized Constants**
   - Status and priority values are hardcoded in UI components
   - **Recommendation:** Create `lib/constants.js` with:
     ```javascript
     export const TICKET_STATUSES = [
       'open',
       'in_progress',
       'waiting',
       'on_hold',
       'resolved',
       'closed'
     ];
     
     export const TICKET_PRIORITIES = [
       'low',
       'medium',
       'high',
       'urgent'
     ];
     ```

### Recommendations

1. **Create Field Registry**
   - Create `lib/automation/field-registry.js` with canonical field values
   - Use this registry in:
     - Automation builder UI (dropdowns)
     - Automation engine (condition checking)
     - Validation logic

2. **Status Values for Automation**
   - **Canonical Status Values:** `["open", "in_progress", "waiting", "on_hold", "resolved", "closed"]`
   - These match the UI and represent the full lifecycle of a ticket

3. **Priority Values for Automation**
   - **Canonical Priority Values:** `["low", "medium", "high", "urgent"]`
   - These match both the database and UI

4. **Case Sensitivity**
   - ✅ All values are consistently lowercase
   - Automation engine should use case-insensitive comparison or normalize to lowercase

---

## 6. Field Registry Recommendations

### Recommended Field Registry Structure

```javascript
// lib/automation/field-registry.js

export const FIELD_REGISTRY = {
  status: {
    field: 'status',
    type: 'string',
    values: ['open', 'in_progress', 'waiting', 'on_hold', 'resolved', 'closed'],
    default: 'open',
    displayNames: {
      'open': 'Open',
      'in_progress': 'In Progress',
      'waiting': 'Waiting',
      'on_hold': 'On Hold',
      'resolved': 'Resolved',
      'closed': 'Closed'
    }
  },
  priority: {
    field: 'priority',
    type: 'string',
    values: ['low', 'medium', 'high', 'urgent'],
    default: 'low',
    displayNames: {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'urgent': 'Urgent'
    }
  },
  // Add more fields as needed
  departmentId: {
    field: 'departmentId',
    type: 'string',
    values: null, // Dynamic - fetch from database
  },
  assigneeId: {
    field: 'assigneeId',
    type: 'string',
    values: null, // Dynamic - fetch from database
  }
};
```

---

## 7. Summary

### Status Values (Canonical)
**For Automation Engine:** `["open", "in_progress", "waiting", "on_hold", "resolved", "closed"]`

**Rationale:** These represent the complete ticket lifecycle as defined in the UI. While the current database only contains `resolved` and `closed`, new tickets will start as `open` (per schema default).

### Priority Values (Canonical)
**For Automation Engine:** `["low", "medium", "high", "urgent"]`

**Rationale:** These match both the database and UI exactly. All values are present in the database and consistently lowercase.

### Case Handling
- ✅ All values are lowercase
- ✅ No case inconsistencies detected
- **Recommendation:** Automation engine should normalize comparisons to lowercase for safety

### Next Steps
1. Create `lib/automation/field-registry.js` with canonical values
2. Update automation builder UI to use registry
3. Update automation engine condition checking to use registry
4. Consider adding validation to prevent invalid status/priority values

---

**End of Audit Report**

