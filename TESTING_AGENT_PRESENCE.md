# Testing Agent Presence System

## Prerequisites

1. Make sure the development server is running:
   ```bash
   npm run dev
   ```

2. Ensure you have at least one agent in the database. If not, create one via the admin panel.

## Testing Steps

### 1. Test Presence Indicators on Agents List

1. **Navigate to Agents List:**
   - Go to `http://localhost:3000/admin/agents`
   - You should see all agents with their presence indicators

2. **Verify Presence Display:**
   - Check that each agent shows a presence badge (Online, Offline, Away, etc.)
   - The indicator should have:
     - A colored dot (green for online, gray for offline, etc.)
     - An icon (clock for away, video for in meeting, etc.)
     - A label badge

3. **Test Filtering:**
   - Use the status filter dropdown
   - Filter by "Online" - should show only online agents
   - Filter by "Offline" - should show only offline agents

### 2. Test Presence Selector on Agent Detail Page

1. **Open Agent Profile:**
   - Click on any agent from the agents list
   - Navigate to `/admin/agents/{agent-slug}`

2. **Find Presence Selector:**
   - Look for the "Presence Status" section in the agent details grid
   - You should see:
     - A presence indicator (colored dot + icon)
     - A dropdown button showing current status

3. **Change Presence Status:**
   - Click the presence selector dropdown
   - You should see all 7 status options:
     - Online (green)
     - Away (yellow)
     - Busy (orange)
     - In Meeting (purple)
     - Do Not Disturb (red)
     - On Leave (blue)
     - Offline (gray)
   - Select a different status (e.g., "Away")
   - The status should update immediately

### 3. Test Real-Time Updates (Multi-Tab Testing)

This is the most important test to verify socket functionality:

1. **Open Two Browser Windows/Tabs:**
   - Window 1: Open `/admin/agents` (agents list)
   - Window 2: Open `/admin/agents/{agent-slug}` (agent detail page)

2. **Change Presence in Window 2:**
   - In the agent detail page, change the presence status
   - Example: Change from "Online" to "Busy"

3. **Verify Real-Time Update in Window 1:**
   - Check Window 1 (agents list)
   - The agent's presence indicator should update automatically
   - No page refresh needed!

4. **Test Multiple Status Changes:**
   - Try changing to different statuses:
     - Online → Away → Busy → In Meeting → DND → On Leave → Offline
   - Each change should reflect in both windows instantly

### 4. Test API Endpoint Directly

You can also test the API endpoint directly:

```bash
# Get current presence
curl http://localhost:3000/api/admin/agents/{agent-id}/presence

# Update presence (replace {agent-id} with actual agent ID)
curl -X PATCH http://localhost:3000/api/admin/agents/{agent-id}/presence \
  -H "Content-Type: application/json" \
  -d '{"presenceStatus": "busy"}'
```

### 5. Test Socket Connection

1. **Open Browser Console:**
   - Press F12 to open developer tools
   - Go to Console tab

2. **Check Socket Connection:**
   - You should see connection logs:
     ```
     [useSocket] connected <socket-id>
     ```
   - If you see connection errors, check:
     - Is the server running?
     - Are there any CORS issues?
     - Check Network tab for WebSocket connection

3. **Monitor Socket Events:**
   - In Console, you can manually listen for events:
     ```javascript
     // This won't work directly, but you can check Network tab
     // Look for WebSocket frames with "agent:presence:update"
     ```

### 6. Test Presence Persistence

1. **Change Status:**
   - Set an agent's status to "Busy"
   - Refresh the page
   - The status should persist (still show "Busy")

2. **Check Database:**
   - The `presenceStatus` field in the Agent table should be updated
   - You can verify using Prisma Studio:
     ```bash
     npm run prisma:studio
     ```
   - Navigate to Agent table and check `presenceStatus` column

### 7. Test All Presence Statuses

Go through each status and verify:

- ✅ **Online**: Green pulsing dot, "Online" badge
- ✅ **Away**: Yellow dot with clock icon, "Away" badge
- ✅ **Busy**: Orange dot with alert icon, "Busy" badge
- ✅ **In Meeting**: Purple dot with video icon, "In Meeting" badge
- ✅ **Do Not Disturb**: Red dot with bell-off icon, "Do Not Disturb" badge
- ✅ **On Leave**: Blue dot with moon icon, "On Leave" badge
- ✅ **Offline**: Gray static dot, "Offline" badge

### 8. Test Edge Cases

1. **Disconnect/Reconnect:**
   - Change status to "Online"
   - Close the browser tab
   - Reopen the page
   - Status should be preserved (or set to "offline" if socket disconnects)

2. **Multiple Agents:**
   - Change status for multiple different agents
   - Verify each updates independently
   - Check that the agents list shows correct statuses for all

3. **Invalid Status:**
   - Try to send an invalid status via API:
     ```bash
     curl -X PATCH http://localhost:3000/api/admin/agents/{agent-id}/presence \
       -H "Content-Type: application/json" \
       -d '{"presenceStatus": "invalid"}'
     ```
   - Should return 400 error with message about valid statuses

## Troubleshooting

### Presence Not Updating in Real-Time

1. **Check Socket Connection:**
   - Open browser console
   - Look for connection errors
   - Verify WebSocket is connected in Network tab

2. **Check Server Logs:**
   - Look for socket connection logs
   - Check for any errors in terminal

3. **Verify Socket Server:**
   - Make sure `/api/socket` route is accessible
   - Check that Socket.IO server initialized successfully

### Presence Selector Not Appearing

1. **Check Component Import:**
   - Verify `AgentPresenceSelector` is imported correctly
   - Check for any console errors

2. **Check Agent Data:**
   - Ensure agent object has `id` field
   - Verify agent data is loaded before rendering selector

### Status Not Persisting

1. **Check Database:**
   - Verify Prisma schema has `presenceStatus` field
   - Run `npx prisma db push` if needed

2. **Check API Response:**
   - Verify API returns updated status
   - Check Network tab for API responses

## Expected Behavior Summary

✅ **Working Correctly When:**
- Presence indicators show on agents list
- Presence selector appears on agent detail page
- Status changes update immediately
- Real-time updates work across multiple tabs/windows
- Status persists after page refresh
- All 7 status types display correctly with proper colors/icons
- Socket connection is established and maintained
- API endpoint accepts and validates status updates

## Next Steps After Testing

Once testing is complete, you can:
1. Test with multiple users/agents simultaneously
2. Integrate presence into ticket assignment logic
3. Add presence-based filtering to agent selection
4. Implement presence-based routing rules

