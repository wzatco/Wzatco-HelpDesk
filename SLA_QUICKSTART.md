# SLA Management - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Apply Database Changes (Required)

```bash
# Run this in your terminal
npx prisma migrate dev --name add_sla_models
npx prisma generate
```

### Step 2: Access SLA Management

1. Open your admin panel
2. Look for **"SLA Management"** in the sidebar (with clock icon ⏰)
3. Click to open the dashboard

### Step 3: Create Your First Policy

1. Click the **"New Policy"** button
2. Fill in basic info:
   - **Name**: "Standard Support SLA"
   - **Description**: "Default SLA for all tickets"
   - Check ✅ **Default Policy**

3. Set times for each priority:
   - **Low**: Response 8h, Resolution 48h
   - **Medium**: Response 4h, Resolution 24h
   - **High**: Response 1h, Resolution 8h
   - **Urgent**: Response 15m, Resolution 4h

4. Configure business hours (optional):
   - Check ✅ **Use business hours**
   - Select your timezone
   - Enable working days (Mon-Fri)

5. Click **"Create Policy"** ✅

### Step 4: Test It Out

Open your browser console and test:

```javascript
// Test creating SLA timers
const response = await fetch('/api/admin/sla/actions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'start',
    conversationId: 'your_test_ticket_id',
    priority: 'high'
  })
});
const data = await response.json();
console.log('SLA started:', data);
```

### Step 5: View Active Timers

1. Go to **"Active Timers"** tab
2. See your running timers
3. Watch real-time progress

## 📊 View Reports

1. Click **"Reports & Analytics"** tab
2. Select date range
3. View compliance metrics and statistics

## 🎨 Build a Workflow (Optional)

1. Click **"Workflows"** tab
2. Click **"Open Workflow Builder"**
3. Click components to add them to canvas
4. Arrange and connect components
5. Save as draft or publish

## 🔔 Set Up Monitoring

### Option A: Using Node-cron (Recommended)

Install node-cron:
```bash
npm install node-cron
```

Create `lib/cron/sla-monitor.js`:
```javascript
import cron from 'node-cron';
import SLAService from '../sla-service';

// Run every minute
cron.schedule('* * * * *', async () => {
  await SLAService.monitorTimers();
});

export default function startSLAMonitoring() {
  console.log('SLA monitoring started');
}
```

Add to your `pages/_app.js`:
```javascript
import { useEffect } from 'react';
import startSLAMonitoring from '../lib/cron/sla-monitor';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      startSLAMonitoring();
    }
  }, []);

  return <Component {...pageProps} />;
}
```

### Option B: External Cron (Simple)

Add this to your server's crontab:
```bash
* * * * * curl -X POST http://localhost:3000/api/admin/sla/monitor
```

### Option C: Vercel Cron (Serverless)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/sla/monitor",
    "schedule": "* * * * *"
  }]
}
```

## 🔗 Integrate with Your Tickets

### When Creating a Ticket

```javascript
import SLAService from '../lib/sla-service';

// After creating ticket
await SLAService.startTimers(
  ticket.id,
  ticket.priority, // 'low', 'medium', 'high', 'urgent'
  ticket.departmentId, // optional
  ticket.category // optional
);
```

### When Status Changes

```javascript
// Pause when waiting
if (newStatus === 'waiting') {
  await SLAService.pauseTimer(ticketId, 'Waiting for customer');
}

// Resume when back to active
if (newStatus === 'open') {
  await SLAService.resumeTimer(ticketId);
}

// Stop when resolved
if (newStatus === 'resolved') {
  await SLAService.stopTimer(ticketId);
}
```

## 🎯 Key Concepts

### Timer States
- 🟢 **Running**: Actively counting down
- 🟡 **At Risk**: >80% of time elapsed
- 🔴 **Breached**: Exceeded target time
- ⏸️ **Paused**: Temporarily stopped
- ⏹️ **Stopped**: Completed (ticket resolved)

### Priority Levels
- **Low**: Non-urgent, informational
- **Medium**: Standard issues
- **High**: Important, affects productivity
- **Urgent**: Critical, service down

### Escalation Levels
- **Level 1**: 80% - Warning notification to agent
- **Level 2**: 95% - Critical alert to supervisor
- **Breach**: 100%+ - Alerts to all admins

## 📱 Where to Find Things

| Feature | Location |
|---------|----------|
| Create Policy | SLA Management → New Policy button |
| View Policies | SLA Management → Policies tab |
| Active Timers | SLA Management → Active Timers tab |
| Reports | SLA Management → Reports & Analytics tab |
| Workflow Builder | SLA Management → Workflows tab → Open Builder |
| API Docs | `/api/admin/sla/*` endpoints |

## 🆘 Troubleshooting

### Timers Not Starting?
✅ Check if you have an active policy  
✅ Verify priority is valid ('low', 'medium', 'high', 'urgent')  
✅ Check console for errors

### No Notifications?
✅ Verify monitoring is running (check terminal)  
✅ Check notification table in database  
✅ Ensure user IDs are correct

### Wrong Times?
✅ Check timezone in policy  
✅ Verify business hours configuration  
✅ Check if timer is paused

## 📚 More Help

- **Full Guide**: See `SLA_IMPLEMENTATION_GUIDE.md`
- **Examples**: Check `examples/sla-integration-example.js`
- **Summary**: Read `SLA_IMPLEMENTATION_SUMMARY.md`

## ✅ Checklist

Before going live:

- [ ] Database migrated
- [ ] At least one policy created
- [ ] Monitoring service running
- [ ] Test ticket created with SLA
- [ ] Notifications working
- [ ] Reports showing data
- [ ] Business hours configured
- [ ] Team trained on system

## 🎉 You're Ready!

Your SLA Management system is now configured and ready to track your support team's performance. Start creating tickets and watch the timers in action!

---

**Need Help?** Check the full implementation guide or contact your development team.

