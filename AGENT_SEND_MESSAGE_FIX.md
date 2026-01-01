# Agent Send/Receive Message Fix

## Problem
Agent chat was **completely broken** - neither sending nor receiving messages after we fixed the Admin panel.

## Root Cause - The Pattern

### The Socket Configuration
In `lib/agentSocket.js`, the singleton socket is created with:
```javascript
socket = io({
  path: '/api/widget/socket',
  autoConnect: false,  // ← Requires manual connection!
  reconnection: true,
  // ...
});
```

### What Each Panel Needed

| Panel | Auth Context | Page Force-Connect | Status |
|-------|-------------|-------------------|---------|
| **Widget** | N/A | Built-in logic | ✅ Working |
| **Admin** | ❌ No socket in AuthContext | ❌ Missing → **✅ FIXED** | ✅ Fixed in previous commit |
| **Agent** | ✅ Has force-connect in AgentAuthContext | ❌ Missing → **✅ FIXED** | ✅ Fixed in this commit |

### The Issue

**Agent Panel Flow (BEFORE fix):**

1. Agent logs in → `AgentAuthContext` runs useEffect
2. `AgentAuthContext` calls `socket.connect()` ✅
3. Socket connects successfully ✅
4. Agent navigates to ticket page
5. **Ticket page assumes socket is connected** (waits at `checkConnection()` line 442)
6. But the socket might have disconnected or never connected for that page context
7. ❌ Message sending fails: "Connection lost. Please refresh the page."
8. ❌ Message receiving fails: No listener fires

**Agent Panel Flow (AFTER fix):**

1. Agent logs in → `AgentAuthContext` runs useEffect
2. `AgentAuthContext` calls `socket.connect()` ✅
3. Agent navigates to ticket page
4. **NEW**: Ticket page checks `socket.connected` → **Forces connect if needed** ✅
5. Logs: `"✅ Agent Ticket Page: Socket connected successfully! ID: <id>"`
6. Socket emits `join_ticket_room` ✅
7. Socket listener `receive_message` is active ✅
8. ✅ Message sending works
9. ✅ Message receiving works

## Solution Applied

### File: `pages/agent/tickets/[id].js`

Added force-connect logic at the start of the "Track ticket view for presence avatars" useEffect (line ~378):

```javascript
// Track ticket view for presence avatars
useEffect(() => {
  const socket = socketRef.current;
  if (!socket || !id) return;

  // CRITICAL: Force socket connection (ensure socket is connected before using it)
  if (!socket.connected) {
    console.log('🔌 Agent Ticket Page: Socket not connected, forcing connection...');
    socket.connect();
    
    // Add one-time connection event listeners for this page
    socket.once('connect', () => {
      console.log('✅ Agent Ticket Page: Socket connected successfully! ID:', socket.id);
    });
    
    socket.once('connect_error', (error) => {
      console.error('❌ Agent Ticket Page: Socket connection error:', error.message);
    });
  } else {
    console.log('✅ Agent Ticket Page: Socket already connected, ID:', socket.id);
  }

  // ... rest of useEffect (fetch profile, join room, register listeners)
}, [id]);
```

## Verification Checklist

### Agent Ticket Page Already Had (No changes needed):
- ✅ `handleSendMessage` function (line 1239)
  - Checks `socket.connected` before sending
  - Uploads files if attached
  - Emits `send_message` with proper payload
  - Shows "Connection lost" error if socket not connected
- ✅ `handleReceiveMessage` listener (line 559)
  - Filters out own messages using `socketId`
  - Prevents duplicates
  - Updates messages state
  - Auto-scrolls to bottom
- ✅ Socket event registration (line 593-596)
  - `ticket:viewer:joined`
  - `ticket:viewer:left`
  - `connect` (reconnection handler)
  - `receive_message`
- ✅ Cleanup on unmount (line 599-607)
  - Removes all listeners
  - Emits `ticket:leave`
  - Emits `leave_ticket_room`

### What Was Added (THIS FIX):
- ✅ Force-connect check on page load (line 378-392)
- ✅ Debug logging for connection success/failure
- ✅ Socket ID logging for troubleshooting

## Debug Console Logs

When agent opens a ticket page, you'll see:

### Successful Connection:
```
🔌 Agent Ticket Page: Socket not connected, forcing connection...
✅ Agent Ticket Page: Socket connected successfully! ID: abc123xyz
🔌 Agent: Joining room ticket_T12345
```

### Already Connected (from AgentAuthContext):
```
✅ Agent Ticket Page: Socket already connected, ID: abc123xyz
🔌 Agent: Joining room ticket_T12345
```

### Connection Failure:
```
🔌 Agent Ticket Page: Socket not connected, forcing connection...
❌ Agent Ticket Page: Socket connection error: <error message>
```

### Message Flow:
```
// Agent sends message:
📤 Agent: Sending message via Socket.IO: { conversationId, content, ... }

// Customer widget sends message:
📨 Agent: Received message: { id, content, senderType: 'customer', ... }
✅ Agent: Adding new message: <message-id>

// Agent's own message (ignored):
📨 Agent: Received message: { id, content, senderType: 'agent', socketId: abc123xyz }
⚠️ Agent: Ignoring own message (socketId match): <message-id>
```

## Testing Steps

1. **Login as Agent** → `/agent/login`
2. **Check F12 Console** → Should see AgentAuth connection logs
3. **Navigate to any ticket** → `/agent/tickets/<ticket-id>`
4. **Check Console Again** → Should see:
   ```
   ✅ Agent Ticket Page: Socket connected successfully! ID: <socket-id>
   🔌 Agent: Joining room ticket_<ticket-id>
   ```
5. **Type and send a message** → Should send without "Connection lost" error
6. **Open customer widget** → Send message from customer
7. **Verify agent receives it** → Message should appear in real-time

## Files Modified

- ✅ `pages/agent/tickets/[id].js` - Added force-connect logic (line ~378-392)

## Related Files (No Changes)

- `contexts/AgentAuthContext.js` - Has force-connect on login (already working)
- `lib/agentSocket.js` - Socket singleton with `autoConnect: false`
- `src/hooks/useSocket.js` - Returns socketRef
- `pages/admin/tickets/[id].js` - Admin panel (fixed in previous commit)

## Pattern for Future Pages

If you add new pages that use sockets (agent or admin), always add this pattern:

```javascript
useEffect(() => {
  const socket = socketRef.current;
  if (!socket || !id) return;

  // Force connect if needed
  if (!socket.connected) {
    console.log('🔌 [Page Name]: Forcing socket connection...');
    socket.connect();
    
    socket.once('connect', () => {
      console.log('✅ [Page Name]: Connected! ID:', socket.id);
    });
    
    socket.once('connect_error', (error) => {
      console.error('❌ [Page Name]: Connection error:', error.message);
    });
  }

  // Your socket logic here...

  return () => {
    // Cleanup listeners
  };
}, [id]);
```

## Why Both AgentAuthContext AND Page-Level Force-Connect?

### AgentAuthContext (Global):
- Connects socket when agent **logs in**
- Sets up auth token
- Good for general connection establishment

### Page-Level Force-Connect (Local):
- Ensures socket is connected **when page loads**
- Handles edge cases:
  - Socket disconnected between pages
  - Page loaded before AgentAuthContext completed
  - Browser refresh on ticket page
  - Direct navigation to ticket URL

**Best Practice**: Both layers provide redundancy and robustness ✅

---

**Fix Applied**: December 2024  
**Issue**: Agent send/receive messages completely broken  
**Status**: RESOLVED ✅  
**Related**: ADMIN_SEND_MESSAGE_FIX.md (same pattern applied to admin panel)
