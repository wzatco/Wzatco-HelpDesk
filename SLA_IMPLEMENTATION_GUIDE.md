# SLA Management System - Implementation Guide

## Overview

A comprehensive Service Level Agreement (SLA) Management system has been successfully implemented in the admin panel. This system helps track, monitor, and enforce response and resolution time targets for support tickets.

## 🎯 Features Implemented

### 1. **SLA Policies Management**
- Create and manage multiple SLA policies
- Define response and resolution times for each priority level (Low, Medium, High, Urgent)
- Configure business hours and timezones
- Set up escalation thresholds (Level 1 & Level 2)
- Configure pause conditions (waiting for customer, on hold, off hours)
- Apply policies to specific departments or categories

### 2. **Workflow Builder**
- Visual drag-and-drop workflow designer
- 5 categories of components:
  - **Triggers**: Ticket Created, Priority Updated, Status Changed
  - **Conditions**: Check Priority, Department, Business Hours, Customer Response
  - **Timers**: Response Timer, Resolution Timer, Custom Timer
  - **Actions**: Send Email, Assign Agent, Update Priority/Status, Create Escalation, Add Note
  - **Pause/Stop**: Pause SLA, Resume SLA, Stop SLA
- Save workflows as drafts or publish them
- Multiple versions support

### 3. **Active Timer Monitoring**
- Real-time tracking of all active SLA timers
- Color-coded status indicators:
  - 🟢 Green: On Track
  - 🟡 Yellow: At Risk (>80%)
  - 🔴 Red: Breached
  - ⏸️ Gray: Paused
- Timer details with elapsed/remaining time
- Percentage progress tracking

### 4. **Reports & Analytics**
- SLA compliance rate
- Average response and resolution times
- Breach analysis by type
- Timer status overview
- Policy performance metrics
- Escalation summary
- Date range filtering (7, 30, 90, 365 days)

### 5. **Automated Notifications**
- Level 1 escalation at 80% (Warning)
- Level 2 escalation at 95% (Critical)
- Breach notifications to agents and supervisors
- Automatic notification creation in system

### 6. **Background Monitoring Service**
- Continuous SLA timer monitoring
- Automatic breach detection
- Escalation handling
- Pause/resume logic based on ticket status

## 📁 File Structure

```
pages/admin/sla/
├── index.js                      # Main SLA dashboard with tabs
├── policies/
│   └── new.js                   # Create/edit SLA policy
├── workflows/
│   └── builder.js               # Drag-and-drop workflow builder
└── reports.js                   # Analytics and reports page

pages/api/admin/sla/
├── policies/
│   ├── index.js                 # GET/POST policies
│   └── [id].js                  # GET/PUT/DELETE specific policy
├── workflows/
│   ├── index.js                 # GET/POST workflows
│   └── [id].js                  # GET/PUT/DELETE specific workflow
├── timers/
│   └── index.js                 # Get active timers
├── stats.js                     # Get SLA statistics
├── actions.js                   # Start/pause/resume/stop timers
└── monitor.js                   # Background monitoring endpoint

lib/
└── sla-service.js               # Core SLA service logic

prisma/schema.prisma
└── (Added models: SLAPolicy, SLAWorkflow, SLATimer, SLABreach, SLAEscalation)
```

## 🗄️ Database Schema

### SLAPolicy
Stores SLA policy configurations with time targets for each priority level.

**Key Fields:**
- `name`, `description`, `isDefault`, `isActive`
- Response times: `lowResponseTime`, `mediumResponseTime`, `highResponseTime`, `urgentResponseTime`
- Resolution times: `lowResolutionTime`, `mediumResolutionTime`, `highResolutionTime`, `urgentResolutionTime`
- `businessHours` (JSON), `timezone`, `holidays` (JSON)
- `escalationLevel1`, `escalationLevel2`
- Pause conditions: `pauseOnWaiting`, `pauseOnHold`, `pauseOffHours`

### SLAWorkflow
Stores workflow configurations created in the builder.

**Key Fields:**
- `policyId`, `name`, `description`, `version`
- `workflowData` (JSON) - Full workflow canvas data
- `isActive`, `isDraft`, `publishedAt`

### SLATimer
Tracks active SLA timers for tickets.

**Key Fields:**
- `conversationId`, `policyId`, `timerType` (response/resolution)
- `status` (running/paused/stopped/breached)
- `targetTime`, `elapsedTime`, `remainingTime`
- `startedAt`, `pausedAt`, `completedAt`, `breachedAt`
- `totalPausedTime`, `pauseReason`
- Escalation tracking: `level1NotifiedAt`, `level2NotifiedAt`, `breachNotifiedAt`

### SLABreach
Records SLA violations.

**Key Fields:**
- `timerId`, `conversationId`, `breachType`
- `targetTime`, `actualTime`, `breachTime`
- `priority`, `status`, `assignedTo`, `department`
- `notificationsSent` (JSON)
- `breachedAt`, `resolvedAt`

### SLAEscalation
Tracks escalation events.

**Key Fields:**
- `conversationId`, `timerId`, `escalationLevel` (1/2/3)
- `escalationType` (time_based/sla_risk/manual)
- Priority/assignment changes tracking
- `notifiedUsers` (JSON), `escalatedAt`, `resolvedAt`

## 🚀 How to Use

### 1. Create an SLA Policy

1. Navigate to **Admin Panel → SLA Management**
2. Click **"New Policy"** button
3. Fill in policy details:
   - Name and description
   - Response and resolution times for each priority
   - Business hours configuration
   - Escalation thresholds
   - Pause conditions
4. Click **"Create Policy"**

### 2. Build a Workflow (Optional)

1. Go to **Workflows** tab
2. Click **"Open Workflow Builder"**
3. Drag components from the left panel to the canvas
4. Connect components in logical order
5. Configure each component's properties
6. Save as draft or publish

### 3. Monitor Active Timers

1. Go to **Active Timers** tab
2. View all running timers with their status
3. Filter by status (Running, At Risk, Paused, Breached)
4. Click on a timer to view details

### 4. View Reports

1. Go to **Reports & Analytics** tab
2. Select date range
3. View compliance metrics, average times, breaches
4. Analyze trends and performance

## 🔧 API Integration

### Start SLA Timers for a Ticket

```javascript
const response = await fetch('/api/admin/sla/actions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'start',
    conversationId: 'ticket_id',
    priority: 'high',
    departmentId: 'dept_id', // optional
    category: 'Technical' // optional
  })
});
```

### Pause SLA Timer

```javascript
const response = await fetch('/api/admin/sla/actions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'pause',
    conversationId: 'ticket_id',
    reason: 'Waiting for customer response'
  })
});
```

### Resume SLA Timer

```javascript
const response = await fetch('/api/admin/sla/actions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'resume',
    conversationId: 'ticket_id'
  })
});
```

### Stop SLA Timer (Ticket Resolved)

```javascript
const response = await fetch('/api/admin/sla/actions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'stop',
    conversationId: 'ticket_id'
  })
});
```

## ⚙️ Background Monitoring Setup

The SLA monitoring service should run periodically to check timers and send notifications.

### Option 1: Node-cron (Recommended)

1. Install node-cron:
```bash
npm install node-cron
```

2. Create a monitoring job:
```javascript
// lib/cron/sla-monitor.js
import cron from 'node-cron';
import SLAService from '../sla-service';

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('Running SLA monitor...');
  await SLAService.monitorTimers();
});
```

### Option 2: External Cron Job

Set up a cron job to call the monitoring endpoint:

```bash
# Run every minute
* * * * * curl -X POST https://your-domain.com/api/admin/sla/monitor
```

### Option 3: Vercel Cron (for Vercel deployments)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/sla/monitor",
    "schedule": "* * * * *"
  }]
}
```

## 🔔 Notification Types

The system creates the following notifications:

1. **sla_risk** - Timer at 80% or 95% (escalation warnings)
2. **sla_breach** - Timer exceeded target time

Notifications are created in the `Notification` table and can be displayed in the UI notification center.

## 📊 Using SLA Service Programmatically

```javascript
import SLAService from '../lib/sla-service';

// Start timers when ticket created
await SLAService.startTimers(conversationId, 'high', departmentId, category);

// Pause timer when status changes to waiting
await SLAService.pauseTimer(conversationId, 'Waiting for customer');

// Resume when customer responds
await SLAService.resumeTimer(conversationId);

// Stop timer when ticket resolved
await SLAService.stopTimer(conversationId);

// Manual monitoring check
await SLAService.monitorTimers();
```

## 🎨 UI Components

### Color Coding

- **Green** (#10b981): On track / Met SLA
- **Yellow** (#f59e0b): At risk (>80%)
- **Red** (#ef4444): Breached / Critical
- **Blue** (#3b82f6): Running / Active
- **Gray** (#6b7280): Paused / Inactive

### Component Categories (Workflow Builder)

- **Triggers** (🟢 Green): Starting points
- **Conditions** (🟡 Yellow): Decision points
- **Timers** (🔵 Blue): Time tracking
- **Actions** (🟣 Purple): Automated tasks
- **Pause/Stop** (🔴 Red): Timer controls

## 🔐 Security Considerations

1. All SLA endpoints should be protected with authentication
2. Only admin/supervisor roles should access SLA management
3. API keys should be secured if using external cron jobs
4. Validate all input data before processing

## 📝 Migration Steps

To apply the database schema changes:

```bash
# Generate migration
npx prisma migrate dev --name add_sla_models

# Apply migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

## 🧪 Testing

1. Create a test SLA policy with short timers (e.g., 5 minutes)
2. Create a test ticket
3. Monitor the timer progress
4. Test pause/resume functionality
5. Let timer breach and verify notifications
6. Check reports for accurate data

## 🐛 Troubleshooting

### Timers Not Starting
- Check if an active SLA policy exists
- Verify policy filters match the ticket (department/category)
- Check console logs for errors

### Notifications Not Sending
- Verify monitoring service is running
- Check notification creation in database
- Ensure user IDs are correct

### Inaccurate Time Calculations
- Verify timezone settings in policy
- Check business hours configuration
- Ensure pause/resume logic is working

## 📚 Additional Resources

- Refer to `SLA Guide.md` for detailed workflow component specifications
- Check Prisma documentation for schema modifications
- Review Next.js API routes documentation for endpoint customization

## ✅ Checklist for Production

- [ ] Database migrations applied
- [ ] At least one default SLA policy created
- [ ] Background monitoring service configured
- [ ] Notification system integrated
- [ ] Reports tested with sample data
- [ ] User permissions configured
- [ ] Business hours set correctly
- [ ] Escalation recipients configured
- [ ] Documentation reviewed by team

## 🎉 Summary

The SLA Management system provides a complete solution for tracking and enforcing service level agreements in your helpdesk. With automated monitoring, real-time notifications, and comprehensive analytics, your team can ensure timely responses and maintain high customer satisfaction.

For questions or issues, refer to the implementation files or consult the development team.

