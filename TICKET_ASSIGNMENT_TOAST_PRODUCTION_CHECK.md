# Ticket Assignment Toast - Production Verification Guide

## Overview
This document outlines the checks needed to verify that the ticket assignment toast notification (bottom-right corner) is working correctly in production.

## What Was Fixed

### 1. CORS Configuration (server.js)
**Issue:** The Socket.IO CORS configuration was using `process.env.CLIENT_URL` which might not be set or might not match the production URL.

**Fix Applied:**
- Updated CORS to check both `CLIENT_URL` and `NEXT_PUBLIC_BASE_URL`
- Added fallback to allow all origins if neither is set (for development/testing)
- Added console logging to show which CORS origins are configured

**File Modified:** `server.js` (lines 61-75)

### 2. Enhanced Logging (contexts/AgentAuthContext.js)
**Added:**
- Socket connection status logging when ticket assignment events are received
- Better debugging information for production troubleshooting

**File Modified:** `contexts/AgentAuthContext.js` (line 84)

## How the Toast System Works

### Flow:
1. **Server Side:** When a ticket is assigned (manual or auto), the API calls `chatService.emitTicketAssignment()`
2. **Socket Emission:** Event is emitted to the agent's personal room: `agent_<agentId>`
3. **Client Side:** `AgentAuthContext.js` listens for `ticket:assigned` events
4. **Toast Display:** If the event is for the current agent, a toast is added to `assignmentToasts` state
5. **UI Rendering:** `TicketAssignmentToasts` component renders the toast in bottom-right corner

### Key Components:
- **Server:** `lib/chat-service.js` → `emitTicketAssignment()` method
- **Client Socket:** `lib/agentSocket.js` → `getAgentSocket()` singleton
- **Context:** `contexts/AgentAuthContext.js` → Listens for `ticket:assigned` events
- **UI Component:** `components/agent/TicketAssignmentToasts.js` → Renders toasts

## Production Verification Steps

### 1. Check Environment Variables
Verify these are set in production:
```bash
# Required for Socket.IO CORS
CLIENT_URL=https://sienna-scorpion-646682.hostingersite.com
# OR
NEXT_PUBLIC_BASE_URL=https://sienna-scorpion-646682.hostingersite.com
```

### 2. Check Server Logs
When server starts, you should see:
```
🌐 Socket.IO CORS configured for: ["https://sienna-scorpion-646682.hostingersite.com"]
✅ Socket.IO initialized on /api/widget/socket
```

### 3. Check Browser Console (Agent Panel)
When an agent logs in, you should see:
```
🛠️ AgentSocket: Singleton Created (path: /api/widget/socket)
✅ AgentAuth: Socket connected, ID: <socket-id>
✅ AgentAuth: Socket transport: websocket (or polling)
```

### 4. Test Ticket Assignment
**Steps:**
1. Login as an agent in the agent panel
2. Open browser console (F12)
3. In admin panel, assign a ticket to that agent
4. Check console for:
   ```
   🎫 AgentAuth: Ticket assigned event received (via personal room): {...}
   🎫 AgentAuth: Socket connection status: connected
   ✅ AgentAuth: This ticket is assigned to current agent (via personal room)!
   📢 AgentAuth: Adding assignment toast: {...}
   ```
5. Check if toast appears in bottom-right corner

### 5. Check Server Logs (When Assigning)
When assigning a ticket, server should log:
```
📢 Emitting ticket:assigned event for ticket TKT-xxx to agent <agent-id>
🔔 Emitting ticket:assigned to personal room: agent_<agent-id>
✅ ticket:assigned event emitted to agent <agent-id>'s personal room
```

## Common Issues & Solutions

### Issue 1: Toast Not Appearing
**Possible Causes:**
- Socket not connected
- CORS blocking connection
- Event not being emitted
- Agent not in correct room

**Debug Steps:**
1. Check browser console for socket connection errors
2. Verify `socket.connected === true` in console
3. Check server logs for event emission
4. Verify agent ID matches in assignment and socket room

### Issue 2: CORS Errors
**Symptoms:**
- Browser console shows CORS errors
- Socket connection fails

**Solution:**
- Ensure `CLIENT_URL` or `NEXT_PUBLIC_BASE_URL` is set in production
- Verify the URL matches exactly (including https://)
- Check server logs for CORS configuration

### Issue 3: Socket Not Connecting
**Symptoms:**
- No socket connection logs in browser
- `socket.connected === false`

**Solution:**
- Check if Socket.IO server is running
- Verify `/api/widget/socket` path is accessible
- Check network tab for WebSocket connection attempts
- Verify agent is authenticated (has token in localStorage)

### Issue 4: Event Not Received
**Symptoms:**
- Server logs show event emitted
- Client doesn't receive event

**Solution:**
- Verify agent joined personal room: `agent_<agentId>`
- Check if agent ID in assignment matches logged-in agent ID
- Verify socket is connected before assignment happens

## Testing Checklist

- [ ] Server starts without errors
- [ ] CORS configuration logged correctly
- [ ] Agent can connect to Socket.IO
- [ ] Socket connection shows in browser console
- [ ] Manual assignment triggers toast
- [ ] Auto-assignment triggers toast
- [ ] Toast appears in bottom-right corner
- [ ] Toast shows correct ticket information
- [ ] Toast auto-dismisses after 10 seconds
- [ ] Clicking toast navigates to ticket
- [ ] Multiple toasts stack correctly

## Files to Monitor

### Server Logs:
- Socket.IO initialization
- CORS configuration
- `ticket:assigned` event emissions
- Agent room joins

### Browser Console:
- Socket connection status
- `ticket:assigned` event reception
- Toast creation logs
- Any errors

## Next Steps

1. Deploy the updated `server.js` with improved CORS configuration
2. Verify environment variables are set correctly
3. Test ticket assignment in production
4. Monitor server and browser logs
5. Report any issues found

