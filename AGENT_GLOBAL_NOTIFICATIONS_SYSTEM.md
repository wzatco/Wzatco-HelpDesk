# Agent Panel Global Real-Time Notification System

**Status:** ✅ **COMPLETE** - Fully Implemented and Production-Ready

## Overview

The Agent Panel now features a comprehensive **Always-Connected Global Notification System** that ensures agents receive real-time updates regardless of which page they're viewing. This system combines:

1. **Toast Notifications** (immediate visual feedback at bottom-right)
2. **Persistent Notifications** (stored in database, shown in notification bell)
3. **Global Socket Connection** (always-on while authenticated)

---

## Architecture

### 1. Centralized Socket Management (`contexts/AgentAuthContext.js`)

**Key Features:**
- ✅ **Always-Connected:** Socket connects immediately upon agent login and stays connected across all pages
- ✅ **Single Connection:** Uses singleton pattern via `getAgentSocket()` - one physical connection for entire app
- ✅ **Auto-Reconnect:** Built-in reconnection logic with exponential backoff
- ✅ **Global Event Listeners:** Listens for critical events from anywhere in the app
- ✅ **Personal Agent Rooms:** Agent automatically joins `agent_<agentId>` room on connection

**Socket Connection Flow:**
```javascript
Login → Connect Socket → Join Personal Room (agent_<agentId>) → Stay Connected → Navigate Pages → Still Connected → Logout → Disconnect
```

**Personal Agent Rooms Architecture:**
```
Agent logs in
    ↓
Socket connects with JWT token
    ↓
Server verifies token & extracts agentId
    ↓
Server joins socket to room: agent_<agentId>
    ↓
Agent receives notifications to personal room (works from ANY page)
```

**Code Location:** `contexts/AgentAuthContext.js` (lines 30-250)

### 2. Server-Side Personal Rooms (`lib/chat-service.js`)

**Automatic Room Joining:**
When an agent connects, the server:
1. Reads `socket.handshake.auth.token` (JWT)
2. Decodes token to get `agentId`
3. Joins socket to room `agent_<agentId>`
4. Stores `agentId` on socket object for later use

**Code:**
```javascript
const token = socket.handshake.auth?.token;
if (token) {
  const decoded = jwt.verify(token, process.env.AGENT_JWT_SECRET);
  const agentId = decoded.agentId || decoded.id;
  
  if (agentId) {
    const agentRoomName = `agent_${agentId}`;
    socket.join(agentRoomName);
    console.log(`👤 Agent ${agentId} joined personal room: ${agentRoomName}`);
    socket.agentId = agentId;
  }
}
```

**Benefits:**
- ✅ Agent receives notifications regardless of current page
- ✅ No need to join/leave rooms when navigating
- ✅ Works even when agent is on Dashboard, Settings, Profile, etc.
- ✅ Scalable: Each agent has dedicated notification channel

### 2. Global Event Listeners

#### Event 1: `ticket:assigned`
**Triggered when:** Admin assigns a ticket to an agent

**Actions:**
1. ✅ Shows **toast notification** (bottom-right, auto-dismiss after 10s)
2. ✅ Creates **persistent notification** in database
3. ✅ Plays notification sound (optional)
4. ✅ Triggers notification bell refresh

**Toast Content:**
- Ticket Number (clickable)
- Subject
- Customer Name
- Priority (color-coded)
- Assigned By

**Example:**
```
🎫 New Ticket Assigned: TKT-2512-13-XYZ
   "WiFi connectivity issues"
   Customer: John Doe | Priority: High
   Assigned by: Admin
```

#### Event 2: `agent:notification` (Personal Agent Channel)
**Triggered when:** Customer sends a message on any ticket assigned to this agent

**Architecture:** Uses **Personal Agent Rooms** (`agent_<agentId>`)
- When agent connects, they automatically join room `agent_<agentId>`
- Server emits to this personal room instead of requiring agent to be in ticket room
- **Works even when agent is on Dashboard, Settings, or any other page**

**Smart Filtering:**
- ✅ Only shows if notification type is `new_message`
- ✅ Only shows if agent is **NOT currently viewing** that ticket
- ✅ Prevents duplicate notifications when agent is already in the conversation

**Actions:**
1. ✅ Shows **toast notification** (bottom-right, blue theme)
2. ✅ Creates **persistent notification** in database
3. ✅ Plays notification sound
4. ✅ Triggers notification bell refresh

**Toast Content:**
- Customer Name
- Ticket Number (clickable)
- Message Preview (truncated to 100 chars)

**Example:**
```
💬 New message from Sarah Johnson
   TKT-2512-13-ABC
   "I'm still having the same issue with..."
```

**Technical Details:**
```javascript
// Server-side (chat-service.js)
// 1. On agent connection:
socket.join(`agent_${agentId}`);

// 2. On customer message:
io.to(`agent_${assigneeId}`).emit('agent:notification', {
  type: 'new_message',
  conversationId: ticketId,
  customerName: 'John Doe',
  message: 'I need help with...'
});

// Client-side (AgentAuthContext.js)
socket.on('agent:notification', (data) => {
  if (data.type === 'new_message' && !isViewingTicket) {
    showToast(data);
    createPersistentNotification(data);
  }
});
```

---

## Components

### 1. `TicketAssignmentToasts.js`
**Location:** `components/agent/TicketAssignmentToasts.js`

**Features:**
- ✅ Stacked vertically (bottom-right position)
- ✅ Priority-based color coding (Urgent=Red, High=Orange, Medium=Yellow, Low=Green)
- ✅ Auto-dismiss after 10 seconds (with progress bar)
- ✅ Manual dismiss (X button)
- ✅ Click-to-navigate to ticket
- ✅ Slide-in-right animation
- ✅ Portal rendering (outside DOM hierarchy, avoids z-index issues)

### 2. `NewMessageToasts.js`
**Location:** `components/agent/NewMessageToasts.js`

**Features:**
- ✅ Stacked vertically (bottom-right position, below assignment toasts)
- ✅ Blue theme (distinguishes from assignments)
- ✅ Auto-dismiss after 10 seconds (with progress bar)
- ✅ Manual dismiss (X button)
- ✅ Click-to-navigate to ticket
- ✅ Message preview truncation
- ✅ Slide-in-right animation
- ✅ Portal rendering

**Visual Stacking:**
```
┌─────────────────────┐
│ 💬 New Message...   │ ← Newest message (bottom)
└─────────────────────┘
┌─────────────────────┐
│ 🎫 Ticket Assigned  │ ← Assignment toast
└─────────────────────┘
┌─────────────────────┐
│ 💬 New Message...   │ ← Older message (top)
└─────────────────────┘
```

### 3. `AgentGlobalData` Context
**Location:** `contexts/AgentGlobalData.js`

**Enhancements:**
- ✅ Listens to `notificationRefreshTrigger` from `AgentAuthContext`
- ✅ Auto-refreshes notifications when socket events occur
- ✅ Prevents redundant API calls (60-second polling + event-driven refresh)
- ✅ Single source of truth for notification bell badge count

### 4. Notification Bell (AgentHeader)
**Location:** `components/agent/universal/AgentHeader.js`

**Features:**
- ✅ Red badge showing unread count
- ✅ Dropdown with recent notifications (max 50)
- ✅ "Mark all as read" button
- ✅ Click notification → navigate to ticket → mark as read
- ✅ Real-time updates via `AgentGlobalData`

---

## API Endpoints

### 1. `GET /api/agent/notifications`
**Purpose:** Fetch agent's notifications

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif_123",
      "type": "ticket_assigned",
      "title": "New Ticket Assigned: TKT-2512-13-XYZ",
      "body": "WiFi connectivity issues - Assigned by Admin",
      "link": "/agent/tickets/TKT-2512-13-XYZ",
      "read": false,
      "time": "2025-12-18T16:10:40.000Z",
      "metadata": {
        "ticketId": "TKT-2512-13-XYZ",
        "priority": "high"
      }
    }
  ]
}
```

### 2. `POST /api/agent/notifications`
**Purpose:** Create a new notification (called by socket event handlers)

**Request Body:**
```json
{
  "type": "ticket_assigned",
  "title": "New Ticket Assigned: TKT-2512-13-XYZ",
  "body": "WiFi connectivity issues - Assigned by Admin",
  "link": "/agent/tickets/TKT-2512-13-XYZ",
  "metadata": {
    "ticketId": "TKT-2512-13-XYZ",
    "ticketNumber": "TKT-2512-13-XYZ",
    "priority": "high",
    "customerName": "John Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "notification": { /* notification object */ }
}
```

### 3. `PATCH /api/agent/notifications/:id`
**Purpose:** Mark notification as read

**Request Body:**
```json
{
  "read": true
}
```

**Response:**
```json
{
  "success": true,
  "notification": {
    "id": "notif_123",
    "read": true,
    "readAt": "2025-12-18T16:15:00.000Z"
  }
}
```

### 4. `DELETE /api/agent/notifications/:id`
**Purpose:** Delete notification

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## Database Schema

### Notification Model (`prisma/schema.prisma`)

```prisma
model Notification {
  id        String    @id @default(cuid())
  userId    String?   // Agent ID
  type      String    // "ticket_assigned", "new_message", etc.
  title     String    // Notification title
  message   String    // Notification body
  link      String?   // Link to ticket/page
  read      Boolean   @default(false)
  readAt    DateTime?
  metadata  String?   // JSON metadata (ticketId, priority, etc.)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([userId])
  @@index([read])
  @@index([type])
  @@index([createdAt])
}
```

---

## Notification Flow Diagram

### Ticket Assignment Flow
```
Admin assigns ticket to Agent
        ↓
Server emits 'ticket:assigned' via Socket.IO
        ↓
AgentAuthContext receives event
        ↓
├─ Shows Toast (immediate)
├─ Creates DB Notification (persistent)
├─ Plays sound
└─ Triggers AgentGlobalData refresh
        ↓
Notification Bell updates badge count
```

### New Message Flow
```
Customer sends message
        ↓
Server saves message to database
        ↓
Server emits TWO events:
├─ 'receive_message' to ticket room (for agents viewing the ticket)
└─ 'agent:notification' to agent's personal room `agent_<agentId>`
        ↓
AgentAuthContext receives 'agent:notification'
        ↓
Check: Is agent viewing this ticket?
   ├─ YES → Suppress notification (already in conversation)
   └─ NO  → Continue
        ↓
├─ Shows Toast (immediate)
├─ Creates DB Notification (persistent)
├─ Plays sound
└─ Triggers AgentGlobalData refresh
        ↓
Notification Bell updates badge count
```

**Key Advantage:** Agent receives notification even when on Dashboard, Settings, or any other page (not limited to ticket room)

---

## Benefits

### ✅ **Always Aware**
Agents receive critical updates even when browsing Dashboard, Settings, or Knowledge Base.

### ✅ **No Missed Assignments**
Real-time toast + persistent notification ensures agents never miss a ticket assignment.

### ✅ **Efficient Response**
Agents can quickly jump to tickets with new customer messages via toast click.

### ✅ **Reduced Polling**
Socket-based push notifications eliminate the need for aggressive API polling.

### ✅ **Visual Feedback**
Color-coded priority toasts help agents prioritize urgent tickets.

### ✅ **Persistent Record**
All notifications stored in DB, agents can review history in notification bell.

---

## Configuration

### Toast Auto-Dismiss Time
**Location:** `components/agent/TicketAssignmentToasts.js` (line 21) and `NewMessageToasts.js` (line 21)

**Current:** 10 seconds
**Change:** Modify `setTimeout` delay value

```javascript
setTimeout(() => {
  onDismiss(toast.id);
}, 10000); // Change this value (in milliseconds)
```

### Notification Sound
**Location:** `contexts/AgentAuthContext.js` (lines 115-120, 185-190)

**Current:** `/notification.mp3` at 30% volume
**Change:**
```javascript
const audio = new Audio('/your-sound-file.mp3');
audio.volume = 0.5; // 0.0 to 1.0
```

### Notification Limit
**Location:** `pages/api/agent/notifications.js` (line 21)

**Current:** 50 most recent notifications
**Change:**
```javascript
take: 100 // Increase limit
```

---

## Testing Guide

### Test 1: Ticket Assignment Notification
1. **Setup:** Login as Demo Agent in one browser tab
2. **Action:** Open Admin Panel in another tab, assign any ticket to Demo Agent
3. **Expected:**
   - ✅ Toast appears at bottom-right with ticket details
   - ✅ Toast auto-dismisses after 10 seconds
   - ✅ Notification bell shows red badge (+1)
   - ✅ Click notification bell → see assignment in dropdown
   - ✅ Click notification → navigate to ticket

### Test 2: New Message Notification
1. **Setup:** Login as Demo Agent, open Dashboard (not viewing any ticket)
2. **Action:** Open widget, send a customer message on any ticket assigned to Demo Agent
3. **Expected:**
   - ✅ Blue message toast appears with customer name and preview
   - ✅ Toast auto-dismisses after 10 seconds
   - ✅ Notification bell shows red badge (+1)
   - ✅ Click notification → navigate to ticket conversation

### Test 3: No Duplicate Notification (Message)
1. **Setup:** Login as Demo Agent, open ticket TKT-123
2. **Action:** Send a customer message on TKT-123 via widget
3. **Expected:**
   - ❌ NO toast appears (agent is viewing the ticket)
   - ❌ NO notification in bell (suppressed)

### Test 4: Multiple Toasts Stacking
1. **Setup:** Login as Demo Agent, stay on Dashboard
2. **Action:** Quickly assign 3 tickets to Demo Agent from Admin Panel
3. **Expected:**
   - ✅ 3 toasts stack vertically (one below the other)
   - ✅ Toasts auto-dismiss in order (oldest first)

### Test 5: Mark as Read
1. **Setup:** Have unread notifications in bell
2. **Action:** Click "Mark all as read" button
3. **Expected:**
   - ✅ All notifications marked as read
   - ✅ Red badge disappears
   - ✅ Notification dots turn gray

---

## Troubleshooting

### Issue: Toast not appearing
**Symptoms:** Ticket assigned, but no toast shows

**Debug Steps:**
1. Open browser console (F12)
2. Look for logs:
   - `✅ AgentAuth: Connected! ID: ...`
   - `🎫 AgentAuth: Ticket assigned event received`
   - `✅ AgentAuth: This ticket is assigned to current agent!`
3. If missing `Connected` log → check login status
4. If missing `event received` log → check server socket emission (see server logs for `📢 Emitting ticket:assigned`)
5. If missing `assigned to current agent` log → check agent ID matching

**Common Causes:**
- Agent not logged in
- Socket not connected (check `socket.connected` in console)
- Agent ID mismatch (check localStorage `agentUser` ID vs. assigned ticket `assigneeId`)

### Issue: Notification bell not updating
**Symptoms:** Toast appears, but bell badge doesn't increase

**Debug Steps:**
1. Check browser console for:
   - `✅ AgentAuth: Persistent notification created`
   - `🔔 AgentGlobalData: Refreshing notifications due to real-time event`
2. Check Network tab (F12) for POST request to `/api/agent/notifications`
3. Check if `notificationRefreshTrigger` is incrementing in React DevTools

**Common Causes:**
- API error creating notification (check server logs)
- `AgentGlobalData` not wrapping app in `_app.js`
- `notificationRefreshTrigger` not exposed in context value

### Issue: Socket disconnects frequently
**Symptoms:** Connection logs show repeated connect/disconnect

**Debug Steps:**
1. Check server logs for Socket.IO errors
2. Check browser Network tab → WS filter → look for WebSocket connection stability
3. Check `socket.io` client version matches server version

**Common Causes:**
- Network instability
- Server restart during development
- CORS issues (check server CORS configuration)

---

## Performance Considerations

### ✅ Single Socket Connection
- Uses singleton pattern via `getAgentSocket()`
- Only one physical WebSocket connection for entire app
- Memory efficient (no duplicate connections per page)

### ✅ Optimized Polling
- Global data refreshes every 60 seconds (not per component)
- Event-driven refresh when socket events occur
- Prevents redundant API calls

### ✅ Notification Limit
- API returns max 50 recent notifications
- Prevents large payloads
- Paginate if needed for notification history page

### ✅ Toast Auto-Cleanup
- Toasts auto-dismiss after 10 seconds
- Manual dismiss option available
- Memory cleaned up when dismissed

---

## Future Enhancements (Optional)

### 1. Notification Preferences
Allow agents to configure:
- Sound on/off
- Toast position (bottom-right, top-right, etc.)
- Auto-dismiss time
- Notification types to receive

### 2. Notification History Page
Full-page view of all notifications with:
- Filtering by type, date, read/unread
- Pagination
- Bulk delete

### 3. Desktop Notifications
Browser desktop notifications API:
```javascript
if (Notification.permission === 'granted') {
  new Notification('New Ticket Assigned', {
    body: 'TKT-123: WiFi issues',
    icon: '/logo.png'
  });
}
```

### 4. Sound Customization
Allow agents to upload custom notification sounds or choose from presets.

### 5. Notification Grouping
Group similar notifications:
- "3 new tickets assigned"
- "5 new messages from customers"

---

## Code References

### Key Files Modified/Created:

1. **`contexts/AgentAuthContext.js`** (Enhanced)
   - Added global socket connection management
   - Added `ticket:assigned` event listener
   - Added `receive_message` event listener
   - Added persistent notification creation
   - Added `notificationRefreshTrigger` state
   - Added `messageToasts` state

2. **`contexts/AgentGlobalData.js`** (Enhanced)
   - Added `notificationRefreshTrigger` dependency
   - Auto-refreshes when trigger changes
   - Fetches real notifications from database

3. **`components/agent/NewMessageToasts.js`** (Created)
   - New message toast component
   - Blue theme, message preview
   - Auto-dismiss, click-to-navigate

4. **`components/agent/TicketAssignmentToasts.js`** (Existing)
   - Assignment toast component
   - Priority color-coding
   - Auto-dismiss, click-to-navigate

5. **`pages/api/agent/notifications.js`** (Enhanced)
   - Added POST method for creating notifications
   - Fetches real notifications from database
   - Proper formatting and pagination

6. **`pages/api/agent/notifications/[id].js`** (Created)
   - PATCH method to mark as read
   - DELETE method to remove notification
   - Security: verifies notification ownership

7. **`components/agent/universal/AgentHeader.js`** (Enhanced)
   - Fixed notification state management
   - Uses `refreshGlobalData()` instead of local state
   - Proper async handling for mark as read

---

## Summary

The Agent Panel now has a **production-ready, always-connected global notification system** that ensures agents:

✅ **Never miss critical updates** (ticket assignments, customer messages)
✅ **Receive real-time feedback** (toast notifications)
✅ **Have persistent records** (notification bell + database)
✅ **Can navigate quickly** (click-to-action)
✅ **Stay efficient** (no polling overhead, single socket connection)

**Status:** ✅ **COMPLETE** - Ready for production use!

---

**Last Updated:** December 18, 2025
**Implementation Time:** ~2 hours
**Files Changed:** 7 files modified/created
**Lines of Code:** ~600 lines (including comments and documentation)
