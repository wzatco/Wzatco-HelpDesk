# Testing Guide: Agent TAT (Turnaround Time) Per Ticket Computation

**✅ ALL FEATURES CAN BE TESTED FROM THE ADMIN PANEL**

This guide will help you test the TAT computation system that tracks:
- **Agent TAT**: Total time agent spent working on a ticket (from worklogs)
- **First Response Time**: Time from ticket creation to first agent/admin response
- **Resolution Time**: Time from ticket creation to resolution

**Note**: Since you're working on the admin panel (not agent panel), admin messages count as "agent responses" for First Response Time tracking. This is intentional - admins act as agents when responding to tickets.

---

## Prerequisites

1. Make sure the database schema is updated:
   ```bash
   npx prisma db push
   ```

2. Ensure the dev server is running:
   ```bash
   npm run dev
   ```

3. Have at least one ticket in the system (can be assigned or unassigned)

---

## Test Scenario 1: Agent TAT from Worklogs

### Step 1: Create or Select a Ticket
1. Navigate to `/admin/tickets`
2. Select an existing ticket or create a new one
3. Make sure the ticket is assigned to an agent

### Step 2: Auto Worklog (Automatic Tracking)
1. Open the ticket detail page (`/admin/tickets/[ticket-id]`)
2. **Expected Behavior**: 
   - When you open a ticket that is assigned to an agent, an auto worklog should start automatically
   - You should see a "Time Tracking" section in the sidebar showing an active timer
   - The timer should show real-time duration (e.g., "2m 15s")

### Step 3: Stop Auto Worklog
1. Click the "Stop Timer" button in the Time Tracking section
2. **Expected Behavior**:
   - The timer stops
   - The worklog is saved with the duration
   - The Agent TAT should update

### Step 4: Manual Worklog Entry
1. Click "Add Manual Entry" in the Time Tracking section
2. Fill in the form:
   - **Start Time**: Select a past date/time (e.g., yesterday 10:00 AM)
   - **End Time**: Select a later time (e.g., yesterday 11:30 AM)
   - **Description**: "Manual testing entry"
3. Click "Create Worklog"
4. **Expected Behavior**:
   - The worklog is created
   - The duration is calculated (1h 30m in this example)
   - The Agent TAT should update to include this time

### Step 5: Verify Agent TAT Display
1. Scroll to the "Ticket Overview" section in the Details tab
2. Look for the "Turnaround Time (TAT) Metrics" card
3. **Expected Behavior**:
   - You should see "Agent TAT" showing the total time
   - Format should be human-readable (e.g., "1h 30m 45s")
   - The time should be the sum of all worklogs (auto + manual)

---

## Test Scenario 2: First Response Time

### Step 1: Create a New Ticket
1. Navigate to `/admin/tickets`
2. Create a new ticket (or use an existing one that has no agent messages yet)

### Step 2: Send First Admin Message (Counts as Agent Response)
1. Open the ticket detail page
2. In the conversation area, send a message as an admin
3. **Expected Behavior**:
   - The message is sent successfully
   - The First Response Time is calculated automatically
   - The time is from ticket creation to this first message
   - **Note**: Admin messages are treated as agent responses for TAT purposes

### Step 3: Verify First Response Time
1. Go to the "Details" tab
2. Check the "Turnaround Time (TAT) Metrics" card
3. **Expected Behavior**:
   - You should see "First Response" metric
   - It should show the time from ticket creation to first admin/agent message
   - Format: e.g., "5m 23s" or "2h 15m"

### Step 4: Test Multiple Messages
1. Send additional messages as an admin
2. **Expected Behavior**:
   - Only the FIRST admin/agent message counts for First Response Time
   - Subsequent messages don't change this metric

---

## Test Scenario 3: Resolution Time

### Step 1: Select a Ticket
1. Navigate to `/admin/tickets`
2. Select a ticket that is not yet resolved

### Step 2: Resolve the Ticket
1. Open the ticket detail page
2. In the "Ticket Overview" section, click on the Status badge
3. Change status to "Resolved" or "Closed"
4. **Expected Behavior**:
   - Status updates successfully
   - Resolution Time is calculated automatically
   - The time is from ticket creation to resolution

### Step 3: Verify Resolution Time
1. Check the "Turnaround Time (TAT) Metrics" card
2. **Expected Behavior**:
   - You should see "Resolution Time" metric
   - It should show the total time from creation to resolution
   - Format: e.g., "3d 2h 45m"

### Step 4: Test Re-opening
1. Change the ticket status back to "Open" or "Pending"
2. **Expected Behavior**:
   - Resolution Time should remain (it's a historical record)
   - If you resolve again, it should update to the new resolution time

---

## Test Scenario 4: Combined Metrics

### Step 1: Full Workflow Test
1. Create a new ticket
2. Assign it to an agent
3. Wait a few minutes (or manually adjust times)
4. Send the first agent message
5. Create some worklogs (auto and manual)
6. Resolve the ticket

### Step 2: Verify All Metrics
1. Check the "Turnaround Time (TAT) Metrics" card
2. **Expected Behavior**:
   - **Agent TAT**: Sum of all worklog durations
   - **First Response**: Time to first agent message
   - **Resolution Time**: Time from creation to resolution
   - All three metrics should be displayed if they have values

---

## Test Scenario 5: Edge Cases

### Test 1: Ticket with No Worklogs
1. Create a ticket and assign it
2. Don't create any worklogs
3. **Expected Behavior**:
   - Agent TAT should not be displayed (or show 0)
   - Other metrics (First Response, Resolution) should still work

### Test 2: Ticket with No Admin/Agent Messages
1. Create a ticket
2. Don't send any admin/agent messages
3. **Expected Behavior**:
   - First Response Time should not be displayed
   - Agent TAT and Resolution Time should still work if applicable

### Test 3: Active Worklog (Not Stopped)
1. Open a ticket (auto worklog starts)
2. Don't stop the timer
3. **Expected Behavior**:
   - Agent TAT should include the current active duration
   - The timer should show real-time updates

### Test 4: Multiple Worklogs
1. Create multiple worklogs (auto and manual)
2. **Expected Behavior**:
   - Agent TAT should be the sum of all worklogs
   - Each worklog should be listed in the Time Tracking section

---

## API Testing (Optional)

### Test TAT Calculation via API

1. **Get Ticket with TAT Metrics**:
   ```bash
   GET /api/admin/tickets/[ticket-id]
   ```
   Response should include:
   ```json
   {
     "ticket": {
       "agentTATSeconds": 5400,
       "agentTATFormatted": "1h 30m",
       "firstResponseTimeSeconds": 300,
       "firstResponseTimeFormatted": "5m",
       "resolutionTimeSeconds": 86400,
       "resolutionTimeFormatted": "1d"
     }
   }
   ```

2. **Create Worklog and Verify TAT Update**:
   ```bash
   POST /api/admin/worklogs
   {
     "conversationId": "ticket-id",
     "agentId": "agent-id",
     "startedAt": "2024-01-01T10:00:00Z",
     "endedAt": "2024-01-01T11:30:00Z",
     "source": "manual"
   }
   ```
   Then check the ticket again - `agentTATSeconds` should be updated.

---

## Verification Checklist

- [ ] Auto worklog starts when opening assigned ticket
- [ ] Auto worklog stops when leaving/closing ticket
- [ ] Manual worklog can be created with custom times
- [ ] Agent TAT displays correctly (sum of all worklogs)
- [ ] First Response Time tracks first agent message
- [ ] Resolution Time tracks when ticket is resolved
- [ ] TAT metrics update in real-time
- [ ] Format is human-readable (e.g., "1h 30m 45s")
- [ ] Metrics persist after page refresh
- [ ] Multiple worklogs are summed correctly

---

## Troubleshooting

### Issue: TAT metrics not showing
- **Check**: Make sure worklogs exist and have valid durations
- **Check**: Verify the ticket API response includes TAT fields
- **Check**: Look for console errors in browser DevTools

### Issue: First Response Time not updating
- **Check**: Make sure you're sending messages as an agent (not customer)
- **Check**: Verify the message is the FIRST agent message on the ticket
- **Check**: Check browser console for errors

### Issue: Resolution Time not updating
- **Check**: Make sure you're changing status to "resolved" or "closed"
- **Check**: Verify the status change is saved successfully
- **Check**: Check server logs for TAT calculation errors

### Issue: Agent TAT not updating
- **Check**: Verify worklogs are being created successfully
- **Check**: Make sure worklogs have valid start/end times
- **Check**: Check that the worklog API is calling `updateTATMetrics`

---

## Expected Results Summary

After completing all tests, you should see:

1. **Agent TAT**: Accurate sum of all worklog durations
2. **First Response Time**: Time from ticket creation to first agent message
3. **Resolution Time**: Time from ticket creation to resolution
4. **Real-time Updates**: Metrics update automatically when worklogs/messages/status change
5. **Persistence**: Metrics are stored in database and persist across sessions

---

## Notes

- TAT metrics are calculated automatically - no manual intervention needed
- Worklogs can be auto-tracked (when viewing ticket) or manually entered
- First Response Time only tracks the FIRST agent message
- Resolution Time only updates when status changes to "resolved" or "closed"
- All times are stored in seconds but displayed in human-readable format

