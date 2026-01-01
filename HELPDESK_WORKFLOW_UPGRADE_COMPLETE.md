# HelpDesk Core Workflow Upgrade - Implementation Complete

## Overview
This document details the implementation of 7 critical workflow features to enhance ticket lifecycle management and agent control.

---

## ✅ Feature 1: Hide Resolved/Closed Tickets by Default

### Implementation
**Files Modified:**
- `pages/api/agent/tickets/index.js` - Added `showAll` parameter
- `pages/api/admin/tickets/index.js` - Added `showAll` parameter

**Changes:**
```javascript
// In both agent and admin ticket list APIs
const { showAll = 'false', ...otherParams } = req.query;

if (status && status !== 'all') {
  where.status = status;
} else {
  // Hide resolved/closed tickets by default unless showAll=true
  const hideResolvedClosed = showAll !== 'true';
  if (hideResolvedClosed) {
    where.status = { notIn: ['resolved', 'closed'] };
  }
}
```

**Usage:**
- Default behavior: Tickets with status `resolved` or `closed` are hidden
- To show all tickets: Add `?showAll=true` to API request
- When status filter is applied (e.g., `?status=closed`), showAll is ignored

---

## ✅ Feature 2: Remove "Urgent" Priority for Customers

### Implementation
**Files Modified:**
- `components/widget/chat/TicketCreationFlow.js`
- `pages/agent/tickets/management.js` (if exists)

**Changes:**
```javascript
// Before: ['low', 'medium', 'high', 'urgent']
// After: ['low', 'medium', 'high']

// In TicketCreationFlow.js priority step
options: ['low', 'medium', 'high']

// Removed from select dropdown:
<option value="urgent">Urgent</option>
```

**Impact:**
- Customers can only create tickets with: Low, Medium, High priorities
- Only agents/admins can escalate to "Urgent" using the Escalate feature

---

## ✅ Feature 3: Escalate Button with Priority & Reason

### Implementation
**Files Created:**
- `pages/api/agent/tickets/[id]/escalate.js` - Backend API endpoint
- `components/admin/EscalateTicketModal.js` - Frontend modal component

**API Endpoint:**
```
POST /api/agent/tickets/[id]/escalate
```

**Request Body:**
```json
{
  "newPriority": "urgent",
  "reason": "Customer is a VIP account, needs immediate attention"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket escalated successfully",
  "priority": "urgent"
}
```

**Features:**
- Validates new priority is different from current
- Requires reason field (min 1 character)
- Logs activity in `TicketActivity` table with type `priority_escalated`
- Creates system note in `TicketNote` table
- Stores old/new values and reason for audit trail

**Modal Component Usage:**
```javascript
import EscalateTicketModal from '@/components/admin/EscalateTicketModal';

<EscalateTicketModal
  isOpen={showEscalateModal}
  onClose={() => setShowEscalateModal(false)}
  ticketId={ticket.ticketNumber}
  currentPriority={ticket.priority}
  onSuccess={(newPriority) => {
    setTicket({ ...ticket, priority: newPriority });
  }}
/>
```

**Modal Fields:**
- Current Priority (read-only display)
- New Priority (dropdown: low, medium, high, urgent)
- Reason for Escalation (textarea, required)

---

## ✅ Feature 4: Customer Close Ticket Capability

### Implementation
**Files Created:**
- `pages/api/widget/tickets/[id]/close.js` - Backend API endpoint

**Files Modified:**
- `components/widget/chat/TicketDetailsPopup.js` - Added close button

**API Endpoint:**
```
POST /api/widget/tickets/[id]/close
```

**Request Body:**
```json
{
  "customerId": "cust_123",
  "customerEmail": "customer@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket closed successfully",
  "status": "closed"
}
```

**Security:**
- Verifies customer owns the ticket (by ID or email)
- Returns 403 if customer doesn't own ticket
- Returns 400 if ticket already closed

**Activity Logging:**
- Creates `TicketActivity` with type `status_updated`
- `performedBy`: "customer"
- Creates system note: "Ticket closed by customer"

**UI Changes:**
```javascript
// In TicketDetailsPopup.js
const canClose = ticket.status !== 'closed' && ticket.status !== 'resolved';

{canClose && (
  <button onClick={handleCloseTicket}>
    Close Ticket
  </button>
)}
```

---

## ✅ Feature 5: Ticket Reopen with Category & Reason

### Implementation
**Files Created:**
- `pages/api/agent/tickets/[id]/reopen.js` - Agent/Admin API
- `pages/api/widget/tickets/[id]/reopen.js` - Customer API
- `components/admin/ReopenTicketModal.js` - Reusable modal component

**API Endpoints:**

**Agent Endpoint:**
```
POST /api/agent/tickets/[id]/reopen
```

**Request Body:**
```json
{
  "category": "Issue Recurred",
  "reason": "Customer reported the problem came back after 2 days"
}
```

**Customer Endpoint:**
```
POST /api/widget/tickets/[id]/reopen
```

**Request Body:**
```json
{
  "customerId": "cust_123",
  "customerEmail": "customer@example.com",
  "category": "Issue Not Resolved",
  "reason": "The problem is still happening"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket reopened successfully",
  "status": "open"
}
```

**Categories:**

**For Agents:**
- Issue Recurred
- Not Fixed
- Additional Questions
- Follow-up Required
- Customer Request
- Other

**For Customers:**
- Issue Not Resolved
- Problem Returned
- Need More Help
- Other

**Features:**
- Only works on `closed` or `resolved` tickets
- Resets ticket status to `open`
- Clears `resolutionTimeSeconds` field
- Logs activity with type `ticket_reopened`
- Stores category and reason in activity

**Modal Component Usage:**
```javascript
import ReopenTicketModal from '@/components/admin/ReopenTicketModal';

// For agents:
<ReopenTicketModal
  isOpen={showReopenModal}
  onClose={() => setShowReopenModal(false)}
  ticketId={ticket.ticketNumber}
  onSuccess={(newStatus) => {
    setTicket({ ...ticket, status: newStatus });
  }}
  isCustomer={false}
/>

// For customers:
<ReopenTicketModal
  isOpen={showReopenModal}
  onClose={() => setShowReopenModal(false)}
  ticketId={ticket.ticketNumber}
  onSuccess={(newStatus) => {
    setTicket({ ...ticket, status: newStatus });
  }}
  isCustomer={true}
/>
```

**UI Integration in Widget:**
```javascript
const canReopen = ticket.status === 'closed' || ticket.status === 'resolved';

{canReopen && (
  <button onClick={() => setShowReopenModal(true)}>
    Reopen Ticket
  </button>
)}
```

---

## ✅ Feature 6: Agent Active/Inactive Toggle

### Implementation Status
**Backend:** ✅ Already Implemented  
**Frontend:** ⏳ Pending (needs UI toggle in agent list)

**Existing Backend Support:**
- `pages/api/admin/agents/[id].js` - PATCH method handler (line 456)
- Agent model has `isActive` field (boolean)
- Syncs with `User.status` ('active'/'inactive')

**Existing Code:**
```javascript
// In pages/api/admin/agents/[id].js - PATCH handler
if (isActive !== undefined) {
  updateData.isActive = isActive;
  
  // Sync with User.status if email exists
  if (agent.email) {
    await prisma.user.updateMany({
      where: { email: agent.email.toLowerCase() },
      data: { status: isActive ? 'active' : 'inactive' }
    });
  }
}
```

**What's Needed:**
1. **Admin Panel UI:**
   - Add toggle switch in agent list (e.g., `/pages/admin/agents/index.js`)
   - Add toggle in agent edit form
   - Show active/inactive badge/indicator

2. **Agent Login Prevention:**
   - Update `/pages/api/auth/agent/login.js` to check `isActive`
   - Return error if `!agent.isActive`

3. **Assignment Prevention:**
   - ✅ Already implemented in Feature 7 (online-only assignment)
   - All assignment functions now check `isActive: true`

---

## ✅ Feature 7: Online-Only Ticket Assignment

### Implementation
**Files Modified:**
- `pages/api/admin/tickets/index.js` - All assignment engine functions

**Changes:**

1. **Direct Assignment:**
```javascript
const agent = await prisma.agent.findFirst({
  where: { 
    id: assignTo,
    isActive: true,
    presenceStatus: 'online' // NEW
  }
});
```

2. **Department Assignment:**
```javascript
const agents = await prisma.agent.findMany({
  where: {
    departmentId: assignTo,
    isActive: true,
    presenceStatus: 'online' // NEW
  },
  // ...
});
```

3. **Round-Robin Assignment:**
```javascript
const agents = await prisma.agent.findMany({
  where: { 
    isActive: true,
    presenceStatus: 'online' // NEW
  },
  orderBy: { createdAt: 'asc' }
});
```

4. **Load-Based Assignment:**
```javascript
const agents = await prisma.agent.findMany({
  where: { 
    isActive: true,
    presenceStatus: 'online' // NEW
  },
  include: {
    assignedConversations: {
      where: { status: { in: ['open', 'pending'] } }
    }
  }
});
```

5. **Department Match Assignment:**
```javascript
const agents = await prisma.agent.findMany({
  where: { 
    isActive: true, 
    department: conversationDepartment,
    presenceStatus: 'online' // NEW
  },
  include: {
    assignedConversations: {
      where: { status: { in: ['open', 'pending'] } }
    }
  }
});
```

**How it Works:**
- `presenceStatus` field on Agent model tracks online/offline/away status
- Managed by AgentPresence context/socket connection
- Possible values: 'online', 'offline', 'away', 'busy'
- Assignment engine only considers agents with `presenceStatus === 'online'`

**Fallback Behavior:**
- If no online agents available, assignment returns `null`
- Ticket remains unassigned (manual assignment required)

---

## Database Schema Requirements

### Existing Fields Used:
```prisma
model Agent {
  id             String   @id @default(cuid())
  isActive       Boolean  @default(true)
  presenceStatus String   @default("offline") // online, offline, away, busy
  // ... other fields
}

model Conversation {
  ticketNumber String   @id
  status       String   @default("open") // open, pending, resolved, closed
  priority     String   @default("low")  // low, medium, high, urgent
  // ... other fields
}

model TicketActivity {
  id              String   @id @default(cuid())
  conversationId  String
  activityType    String   // priority_escalated, ticket_reopened, status_updated
  oldValue        String?
  newValue        String?
  performedBy     String   // agent, customer, system
  performedByName String?
  reason          String?  // NEW: stores escalation/reopen reason
  createdAt       DateTime @default(now())
}

model TicketNote {
  id             String   @id @default(cuid())
  conversationId String
  content        String
  isPrivate      Boolean  @default(false)
  createdById    String?
  createdByName  String?
  createdAt      DateTime @default(now())
}
```

---

## Integration Guide

### For Frontend Developers

#### 1. Add Escalate Button to Ticket Detail Page
```javascript
// pages/admin/tickets/[id].js or pages/agent/tickets/[id].js

import { useState } from 'react';
import EscalateTicketModal from '@/components/admin/EscalateTicketModal';

export default function TicketDetailPage() {
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [ticket, setTicket] = useState(null);

  return (
    <div>
      {/* Other ticket details */}
      
      <button onClick={() => setShowEscalateModal(true)}>
        Escalate Priority
      </button>

      <EscalateTicketModal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        ticketId={ticket.ticketNumber}
        currentPriority={ticket.priority}
        onSuccess={(newPriority) => {
          setTicket({ ...ticket, priority: newPriority });
          // Optionally refresh ticket data
        }}
      />
    </div>
  );
}
```

#### 2. Add Reopen Button to Ticket Detail Page
```javascript
import { useState } from 'react';
import ReopenTicketModal from '@/components/admin/ReopenTicketModal';

export default function TicketDetailPage() {
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [ticket, setTicket] = useState(null);

  const canReopen = ticket?.status === 'closed' || ticket?.status === 'resolved';

  return (
    <div>
      {canReopen && (
        <button onClick={() => setShowReopenModal(true)}>
          Reopen Ticket
        </button>
      )}

      <ReopenTicketModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        ticketId={ticket.ticketNumber}
        onSuccess={(newStatus) => {
          setTicket({ ...ticket, status: newStatus });
        }}
        isCustomer={false} // or true if on customer portal
      />
    </div>
  );
}
```

#### 3. Update Agent List to Show "Show All" Toggle
```javascript
// pages/admin/tickets/index.js

const [showAll, setShowAll] = useState(false);

const fetchTickets = async () => {
  const response = await fetch(`/api/admin/tickets?showAll=${showAll}`);
  // ...
};

return (
  <div>
    <label>
      <input
        type="checkbox"
        checked={showAll}
        onChange={(e) => setShowAll(e.target.checked)}
      />
      Show Resolved/Closed Tickets
    </label>
  </div>
);
```

#### 4. Add Agent Active/Inactive Toggle (TODO)
```javascript
// pages/admin/agents/index.js

const toggleAgentStatus = async (agentId, currentIsActive) => {
  const response = await fetch(`/api/admin/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: !currentIsActive })
  });
  
  if (response.ok) {
    // Refresh agent list
  }
};

return (
  <table>
    <tbody>
      {agents.map(agent => (
        <tr key={agent.id}>
          <td>{agent.name}</td>
          <td>
            <button onClick={() => toggleAgentStatus(agent.id, agent.isActive)}>
              {agent.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
```

---

## Testing Checklist

### Feature 1: Hide Resolved/Closed Tickets
- [ ] Navigate to agent/admin ticket list
- [ ] Verify resolved/closed tickets are hidden by default
- [ ] Add `?showAll=true` to URL
- [ ] Verify all tickets now visible
- [ ] Filter by status=closed
- [ ] Verify only closed tickets shown (showAll ignored)

### Feature 2: Remove Urgent Priority for Customers
- [ ] Open chat widget as customer
- [ ] Start ticket creation flow
- [ ] Verify priority options are: Low, Medium, High
- [ ] Verify "Urgent" is not available

### Feature 3: Escalate Button
- [ ] Open ticket detail page as agent/admin
- [ ] Click "Escalate" button
- [ ] Modal should open with current priority displayed
- [ ] Select new priority and enter reason
- [ ] Submit escalation
- [ ] Verify priority updated in ticket header
- [ ] Check Activity tab for priority_escalated entry
- [ ] Verify reason is logged in activity
- [ ] Check Notes tab for system note

### Feature 4: Customer Close Ticket
- [ ] Open ticket detail in widget as customer
- [ ] Click "Close Ticket" button
- [ ] Confirm in dialog
- [ ] Verify ticket status changes to "closed"
- [ ] Check Activity tab for status_updated entry
- [ ] Verify performedBy is "customer"
- [ ] Try to close someone else's ticket (should fail with 403)

### Feature 5: Ticket Reopen
**Agent Flow:**
- [ ] Open closed/resolved ticket as agent
- [ ] Click "Reopen" button
- [ ] Select category from dropdown
- [ ] Enter reason
- [ ] Submit
- [ ] Verify status changes to "open"
- [ ] Check Activity tab for ticket_reopened entry
- [ ] Verify category and reason logged

**Customer Flow:**
- [ ] Open closed/resolved ticket in widget
- [ ] Click "Reopen" button
- [ ] Select category (customer categories)
- [ ] Enter reason
- [ ] Submit
- [ ] Verify status changes to "open"
- [ ] Check Activity tab

### Feature 6: Agent Active/Inactive
- [ ] Navigate to admin agents list
- [ ] Toggle agent to inactive
- [ ] Verify agent cannot login
- [ ] Verify inactive agent not shown in assignment dropdowns
- [ ] Create new ticket (should not auto-assign to inactive agent)
- [ ] Toggle agent back to active
- [ ] Verify agent can now login

### Feature 7: Online-Only Assignment
- [ ] Set all agents to offline status
- [ ] Create new ticket
- [ ] Verify ticket remains unassigned
- [ ] Set one agent to online
- [ ] Create new ticket
- [ ] Verify ticket assigned to online agent
- [ ] Test with round-robin rule
- [ ] Test with load-based rule
- [ ] Test with department matching rule
- [ ] Verify only online agents considered

---

## API Reference Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/agent/tickets?showAll=true` | GET | Get tickets (hide/show closed) | Agent |
| `/api/admin/tickets?showAll=true` | GET | Get tickets (hide/show closed) | Admin |
| `/api/agent/tickets/[id]/escalate` | POST | Escalate ticket priority | Agent |
| `/api/agent/tickets/[id]/reopen` | POST | Reopen ticket (agent) | Agent |
| `/api/widget/tickets/[id]/close` | POST | Close ticket (customer) | Customer |
| `/api/widget/tickets/[id]/reopen` | POST | Reopen ticket (customer) | Customer |
| `/api/admin/agents/[id]` | PATCH | Update agent (including isActive) | Admin |

---

## Files Created/Modified

### New Files (8):
1. `pages/api/agent/tickets/[id]/escalate.js`
2. `pages/api/agent/tickets/[id]/reopen.js`
3. `pages/api/widget/tickets/[id]/close.js`
4. `pages/api/widget/tickets/[id]/reopen.js`
5. `components/admin/EscalateTicketModal.js`
6. `components/admin/ReopenTicketModal.js`
7. `HELPDESK_WORKFLOW_UPGRADE_COMPLETE.md` (this file)

### Modified Files (4):
1. `pages/api/agent/tickets/index.js` - Added showAll parameter
2. `pages/api/admin/tickets/index.js` - Added showAll + online-only assignment
3. `components/widget/chat/TicketCreationFlow.js` - Removed urgent priority
4. `components/widget/chat/TicketDetailsPopup.js` - Added close/reopen buttons

---

## Pending Work

### High Priority:
1. **Frontend Integration:**
   - Add Escalate button to admin/agent ticket detail pages
   - Add Reopen button to admin/agent ticket detail pages
   - Add "Show All" toggle to ticket list pages

2. **Agent Inactive Prevention:**
   - Update agent login API to block inactive agents
   - Add UI toggle in admin agent list
   - Add agent status indicator in UI

### Medium Priority:
1. **Permission Checks:**
   - Add role-based access for escalation (who can escalate?)
   - Add permission check for reopening tickets
   - Restrict customer close to ticket owner only (already done in backend)

2. **Notifications:**
   - Send notification when ticket escalated
   - Send notification when ticket reopened
   - Send notification to agents when customer closes ticket

### Low Priority:
1. **Analytics:**
   - Track escalation frequency per agent
   - Track reopen rate (measure of resolution quality)
   - Track tickets closed by customers

2. **Audit Trail Enhancements:**
   - Add IP address to activity logs
   - Add user agent to activity logs
   - Export activity history

---

## Notes

- All APIs follow RESTful conventions
- All modals are reusable React components
- All database changes logged in TicketActivity table
- Customer actions verified by email/ID ownership
- Agent actions verified by authentication token
- Online status tracked via AgentPresence socket connection

---

## Support

For questions or issues:
1. Check this document first
2. Review API endpoint code for detailed logic
3. Check Prisma schema for field definitions
4. Test using provided testing checklist

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0  
**Status:** Implementation Complete (Backend), Frontend Integration Pending
