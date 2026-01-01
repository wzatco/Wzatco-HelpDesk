# Testing Worklog System

## Prerequisites

1. Make sure the development server is running:
   ```bash
   npm run dev
   ```

2. Ensure you have:
   - At least one agent in the database
   - At least one ticket assigned to an agent

## Testing Steps

### 1. Test Auto Worklog Start/Stop

#### Test Auto Start:
1. **Navigate to a Ticket:**
   - Go to `http://localhost:3000/admin/tickets`
   - Click on a ticket that is **assigned to an agent**
   - The ticket detail page should open

2. **Check Worklog Section:**
   - Look at the right sidebar for the "Time Tracking" section
   - You should see:
     - An "Active" badge (green, pulsing)
     - A worklog entry showing the agent's name
     - A real-time duration counter (updating every second)
     - A "Stop Timer" button

3. **Verify Auto Start:**
   - The worklog should start automatically when you open the ticket
   - No manual action needed
   - Check browser console for any errors

#### Test Auto Stop:
1. **Stop via Button:**
   - Click the "Stop Timer" button in the worklog section
   - The active badge should disappear
   - The worklog should show the final duration
   - The worklog should be marked as "Auto"

2. **Stop via Navigation:**
   - Open a ticket (worklog starts)
   - Navigate to another page (e.g., go back to tickets list)
   - The worklog should automatically stop
   - Reopen the same ticket and check - there should be a completed worklog entry

3. **Stop via Page Close:**
   - Open a ticket (worklog starts)
   - Close the browser tab/window
   - The worklog should stop (handled by `beforeunload` event)

### 2. Test Manual Worklog Entry

1. **Open Ticket Detail Page:**
   - Go to a ticket that is assigned to an agent
   - Scroll to the "Time Tracking" section in the sidebar

2. **Open Manual Entry Form:**
   - If there's no active worklog, you should see an "Add Manual Entry" button
   - Click the button
   - A form should appear with:
     - Start Time (datetime-local input)
     - End Time (datetime-local input)
     - Description (optional text input)

3. **Create Manual Entry:**
   - Fill in the start time (e.g., 2 hours ago)
   - Fill in the end time (e.g., 1 hour ago)
   - Add an optional description (e.g., "Reviewed customer complaint")
   - Click "Add Entry"
   - You should see a success notification
   - The form should close
   - A new worklog entry should appear in the list

4. **Verify Manual Entry:**
   - Check that the new entry shows:
     - Agent name
     - Start and end times
     - Duration (calculated automatically)
     - "Manual" label
     - Description (if provided)

5. **Test Validation:**
   - Try submitting without start/end time → Should show error
   - Try submitting with end time before start time → Should show error
   - Try submitting with end time equal to start time → Should show error

### 3. Test Worklog Display on Ticket Page

1. **View Multiple Worklogs:**
   - Create several worklogs (both auto and manual)
   - Check the worklog list in the sidebar
   - Each worklog should show:
     - Agent avatar and name
     - Start time
     - End time (if completed)
     - Duration
     - Source (Auto/Manual)
     - Description (if provided)

2. **Test Active Worklog Display:**
   - Open a ticket with an active worklog
   - The active worklog should:
     - Have a green border and background
     - Show a pulsing green dot
     - Display real-time duration (updating)
     - Show "Active" status

3. **Test Scroll:**
   - If there are many worklogs, the list should scroll
   - Check that the scrollbar works properly

### 4. Test Worklog Summary on Agent Profile

1. **Navigate to Agent Profile:**
   - Go to `http://localhost:3000/admin/agents`
   - Click on any agent
   - Or go directly to `/admin/agents/{agent-slug}`

2. **Open Analytics Tab:**
   - Click on the "Analytics" tab
   - Scroll down to find "Time Tracking Summary" section

3. **Check Summary Cards:**
   - You should see 4 cards:
     - **Total Time**: Shows total hours and minutes worked (last 30 days)
     - **Avg Per Ticket**: Shows average time spent per ticket
     - **Auto Tracked**: Number of automatic worklog entries
     - **Manual Entries**: Number of manual worklog entries

4. **Verify Calculations:**
   - The totals should match the sum of all worklogs
   - Average should be calculated correctly
   - Counts should match the actual number of entries

5. **Test with No Worklogs:**
   - View an agent with no worklogs
   - Should show "No worklogs found" message
   - Should not crash or show errors

### 5. Test Edge Cases

1. **Multiple Agents on Same Ticket:**
   - Assign ticket to Agent A
   - Agent A opens ticket (worklog starts)
   - Reassign ticket to Agent B
   - Agent B opens ticket (new worklog starts)
   - Both worklogs should be visible

2. **Unassigned Ticket:**
   - Try to create manual worklog on unassigned ticket
   - Should show error: "Ticket must be assigned to an agent"

3. **Concurrent Worklogs:**
   - Open ticket in two browser tabs
   - Both should track time independently
   - Check that worklogs are created correctly

4. **Long Duration:**
   - Let a worklog run for a long time (or create manual entry with long duration)
   - Check that duration displays correctly (hours, minutes, seconds)

5. **Timezone Handling:**
   - Create manual worklog with different timezone times
   - Verify times are stored and displayed correctly

### 6. Test API Endpoints Directly

You can also test the API endpoints directly:

```bash
# Get all worklogs for a ticket
curl http://localhost:3000/api/admin/worklogs?conversationId={ticket-id}

# Get all worklogs for an agent
curl http://localhost:3000/api/admin/worklogs?agentId={agent-id}

# Create manual worklog
curl -X POST http://localhost:3000/api/admin/worklogs \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "{ticket-id}",
    "agentId": "{agent-id}",
    "startedAt": "2025-01-01T10:00:00Z",
    "endedAt": "2025-01-01T11:00:00Z",
    "description": "Test worklog",
    "source": "manual"
  }'

# Start auto worklog
curl -X POST http://localhost:3000/api/admin/worklogs/auto/start \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "{ticket-id}",
    "agentId": "{agent-id}"
  }'

# Stop auto worklog
curl -X POST http://localhost:3000/api/admin/worklogs/auto/stop \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "{ticket-id}",
    "agentId": "{agent-id}",
    "worklogId": "{worklog-id}"
  }'
```

### 7. Test Database Persistence

1. **Create Worklog:**
   - Create a worklog (auto or manual)
   - Note the duration and details

2. **Refresh Page:**
   - Refresh the browser page
   - The worklog should still be there
   - All data should persist

3. **Check Database:**
   - You can verify using Prisma Studio:
     ```bash
     npm run prisma:studio
     ```
   - Navigate to Worklog table
   - Check that entries are saved correctly

## Expected Behavior Summary

✅ **Working Correctly When:**
- Auto worklog starts when assigned agent opens ticket
- Auto worklog stops when navigating away or clicking stop
- Manual worklog form appears and submits correctly
- Worklogs display with correct duration and details
- Worklog summary shows accurate statistics
- All worklogs persist after page refresh
- Validation prevents invalid entries
- Multiple worklogs can exist for same ticket
- Real-time duration updates for active worklogs

## Troubleshooting

### Worklog Not Starting Automatically

1. **Check Ticket Assignment:**
   - Ensure ticket is assigned to an agent
   - Check `ticket.assigneeId` is not null

2. **Check Browser Console:**
   - Look for JavaScript errors
   - Check network tab for API errors

3. **Check API Response:**
   - Verify `/api/admin/worklogs/auto/start` returns success
   - Check server logs for errors

### Manual Entry Not Working

1. **Check Form Validation:**
   - Ensure start time is before end time
   - Both times must be filled

2. **Check API:**
   - Verify POST to `/api/admin/worklogs` succeeds
   - Check response for error messages

### Summary Not Showing

1. **Check Agent ID:**
   - Ensure agent ID is correct in API call
   - Verify agent has worklogs in last 30 days

2. **Check Date Range:**
   - Summary shows last 30 days only
   - Create recent worklogs to see data

### Duration Not Updating

1. **Check Active Worklog:**
   - Ensure worklog has no `endedAt` value
   - Check that `durationSeconds` is being calculated

2. **Check Real-time Updates:**
   - Duration should update every second
   - If not, check JavaScript console for errors

## Quick Test Checklist

- [ ] Auto worklog starts when opening assigned ticket
- [ ] Auto worklog stops when clicking stop button
- [ ] Auto worklog stops when navigating away
- [ ] Manual worklog form appears and works
- [ ] Manual worklog validation works
- [ ] Worklogs display correctly on ticket page
- [ ] Active worklog shows real-time duration
- [ ] Worklog summary displays on agent profile
- [ ] Summary calculations are correct
- [ ] Worklogs persist after refresh
- [ ] Multiple worklogs work correctly
- [ ] Error handling works for edge cases

## Next Steps After Testing

Once testing is complete, you can:
1. Test with multiple agents simultaneously
2. Test with high volume of worklogs
3. Verify performance with many worklogs
4. Test integration with TAT computation (next feature)
5. Test with different timezones

