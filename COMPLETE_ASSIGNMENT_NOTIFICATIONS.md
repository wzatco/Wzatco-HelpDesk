# ✅ Complete Assignment Notification System - Test Guide

## Overview

The assignment notification system now works for **ALL** assignment scenarios:
1. ✅ Manual assignment by Admin
2. ✅ Automatic assignment via Rules (Round Robin, Load Based, Skill Match, etc.)
3. ✅ Agent-to-Agent transfer

All three scenarios now emit the `ticket:assigned` event to the assigned agent's **personal room** (`agent_<id>`).

---

## Implementation Summary

### What Was Fixed

| Scenario | File Modified | Change Made |
|----------|--------------|-------------|
| **Manual Assignment** | `pages/api/admin/tickets/[id].js` | Already had `emitTicketAssignment()` ✅ |
| **Auto Assignment (Rules)** | `pages/api/admin/tickets/index.js` | ✅ **Added** `emitTicketAssignment()` after successful auto-assignment |
| **Agent Transfer** | `pages/api/agent/tickets/[id]/assign.js` | ✅ **Added** `emitTicketAssignment()` after agent transfers ticket |

### Emission Pattern (All Scenarios)

```javascript
const { initialize } = await import('lib/chat-service');
const chatService = initialize();

chatService.emitTicketAssignment({
  ticketId: conversation.ticketNumber,
  assigneeId: assignmentResult.agentId,
  assigneeName: assignmentResult.agentName,
  assignedBy: '<WHO ASSIGNED IT>',
  ticket: conversationObject
});
```

**Server emits to:**
```javascript
const agentRoom = `agent_${assigneeId}`;
this.io.to(agentRoom).emit('ticket:assigned', payload);
```

---

## Test Scenarios

### 🧪 Test 1: Manual Assignment (Admin Panel)

**Steps:**
1. Login as **Demo Agent** → Stay on **Agent Dashboard**
2. Open Admin Panel → Tickets → Select any unassigned ticket
3. Click "Assign" → Select "Demo Agent" → Save

**Expected Server Logs:**
```
📢 Emitting ticket:assigned event for ticket TKT-xxx to agent cmj89tzq60005mie0nrtv7qd6
🔔 Emitting ticket:assigned to personal room: agent_cmj89tzq60005mie0nrtv7qd6
✅ ticket:assigned event emitted to agent cmj89tzq60005mie0nrtv7qd6's personal room
```

**Expected Agent Browser:**
- ✅ Toast appears bottom-right
- ✅ Color matches priority (red=critical, orange=high, yellow=medium, green=low)
- ✅ Shows: "New Ticket Assigned", ticket number, subject, customer name
- ✅ "Assigned by: Admin Name"

**Browser Console:**
```
🎫 AgentAuth: Ticket assigned event received (via personal room): {...}
✅ AgentAuth: This ticket is assigned to current agent (via personal room)!
📢 AgentAuth: Adding assignment toast: {...}
```

---

### 🤖 Test 2: Automatic Assignment (Round Robin / Rules)

**Steps:**
1. Login as **Demo Agent** → Stay on **Agent Dashboard**
2. Admin Panel → Settings → Assignment Rules → Enable "Round Robin"
3. Create a new ticket via Widget (`test-chat.html`) or Admin Panel → POST to create ticket API

**Expected Server Logs:**
```
🎯 Auto-assignment successful, emitting ticket:assigned event
📢 Emitting ticket:assigned event for ticket TKT-xxx to agent cmj89tzq60005mie0nrtv7qd6
🔔 Emitting ticket:assigned to personal room: agent_cmj89tzq60005mie0nrtv7qd6
✅ ticket:assigned event emitted to agent cmj89tzq60005mie0nrtv7qd6's personal room
```

**Expected Agent Browser:**
- ✅ Toast appears immediately when ticket created
- ✅ Shows: "Assigned by: Round Robin Assignment (round_robin)" or similar rule name
- ✅ Notification bell counter increases

**Browser Console:**
```
🎫 AgentAuth: Ticket assigned event received (via personal room): {...}
✅ AgentAuth: This ticket is assigned to current agent (via personal room)!
```

---

### 👥 Test 3: Agent-to-Agent Transfer

**Preparation:**
- Need **TWO agents** logged in (use two browsers or incognito)
  - Agent A: Demo Agent (primary)
  - Agent B: Another agent (create if needed)

**Steps:**
1. **Agent A Browser**: Login as Demo Agent → Go to any ticket assigned to you
2. **Agent A**: Click "Assign/Transfer" → Select Agent B → Enter reason: "Transferring for expertise" → Submit
3. **Agent B Browser**: Stay on Dashboard

**Expected Server Logs:**
```
🎯 Agent transfer successful, emitting ticket:assigned event
📢 Emitting ticket:assigned event for ticket TKT-xxx to agent <Agent-B-ID>
🔔 Emitting ticket:assigned to personal room: agent_<Agent-B-ID>
✅ ticket:assigned event emitted to agent <Agent-B-ID>'s personal room
```

**Expected Agent B Browser:**
- ✅ Toast appears immediately
- ✅ Shows: "Assigned by: Demo Agent" (the agent who transferred it)
- ✅ Notification created in database

**Agent A Browser:**
- ✅ Ticket removed from "My Tickets" list (no longer assigned)

---

## Assignment Rule Types Tested

All these should trigger notifications:

| Rule Type | Description | Test Method |
|-----------|-------------|-------------|
| **Round Robin** | Cycles through agents in order | Enable in Settings → Create ticket |
| **Load Based** | Assigns to agent with fewest tickets | Enable in Settings → Create ticket |
| **Skill Match** | Matches ticket category to agent skills | Enable + configure → Create ticket with matching category |
| **Direct Assignment** | Based on department/priority rules | Configure rule → Create matching ticket |

---

## Debugging

### If Toast Does NOT Appear

**Check Server Logs:**
1. Look for `🔔 Emitting ticket:assigned to personal room: agent_<id>`
   - ❌ **Missing?** Assignment code didn't call `emitTicketAssignment()`
   - ✅ **Present?** Check browser logs

**Check Browser Console:**
2. Look for `🎫 AgentAuth: Ticket assigned event received`
   - ❌ **Missing?** Agent not connected to socket or not in personal room
   - ✅ **Present?** Check if event was filtered

3. Look for `✅ AgentAuth: This ticket is assigned to current agent`
   - ❌ **Missing?** `data.assigneeId !== currentUserId` (wrong agent)
   - ✅ **Present?** Check toast state

**Check Agent Connection:**
```
# In browser console:
localStorage.getItem('agentUser')  // Should have id field
localStorage.getItem('agentAuthToken')  // Should exist

# In server logs on login:
👤 Agent <id> joined personal room: agent_<id>
```

---

## Success Criteria

✅ **All 3 scenarios emit socket events**
✅ **Toasts appear from ANY page** (Dashboard, Settings, Profile, etc.)
✅ **Personal room targeting** (no broadcast pollution)
✅ **Persistent notifications** saved to database
✅ **Notification bell** updates in real-time

---

## Code Locations

### Server Side (Emission)
- **Manual Assignment**: `pages/api/admin/tickets/[id].js` line ~508, ~583
- **Auto Assignment**: `pages/api/admin/tickets/index.js` line ~1380 (NEW)
- **Agent Transfer**: `pages/api/agent/tickets/[id]/assign.js` line ~90 (NEW)
- **Chat Service**: `lib/chat-service.js` line ~747 (`emitTicketAssignment` method)

### Client Side (Reception)
- **Listener**: `contexts/AgentAuthContext.js` line ~85 (`socket.on('ticket:assigned', ...)`)
- **Toast Component**: `components/agent/TicketAssignmentToasts.js`

---

## Expected Flow (All Scenarios)

```
1. Assignment Action Triggered
   ├─ Manual (Admin clicks Assign)
   ├─ Auto (Rule engine assigns)
   └─ Transfer (Agent assigns to another)

2. Database Update
   ├─ conversation.assigneeId = newAgentId
   └─ ticketActivity created

3. Socket Emission
   ├─ chatService.emitTicketAssignment() called
   ├─ Targets: agent_<newAgentId> room
   └─ Event: 'ticket:assigned' with payload

4. Agent Browser Receives
   ├─ socket.on('ticket:assigned') fires
   ├─ Validates: assigneeId matches currentUserId
   ├─ Creates toast notification
   └─ Saves persistent notification to DB

5. UI Updates
   ├─ Toast appears bottom-right (10s duration)
   ├─ Notification bell counter increases
   └─ Click toast → Navigate to ticket
```

---

## Notes

- **Why Personal Rooms?** Ensures notifications only reach the assigned agent, not all connected agents
- **Why Three Files?** Different assignment paths (manual admin, automated rules, agent transfer)
- **Why Socket + DB?** Socket for instant feedback (toast), DB for persistence (notification bell)
- **Defensive Programming:** All socket emissions wrapped in try/catch to prevent failures from breaking assignments

---

**Status:** ✅ **COMPLETE - All Assignment Scenarios Covered**

**Last Updated:** December 18, 2025  
**Tested:** Pending user validation
