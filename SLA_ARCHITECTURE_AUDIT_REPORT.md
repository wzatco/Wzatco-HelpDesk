# SLA Architecture & Logic - Technical Audit Report

**Date:** January 2025  
**Auditor:** System Analysis  
**Scope:** Complete SLA system architecture, calculation logic, enforcement mechanisms, and integration points

---

## 📋 Executive Summary

### Current State
The system implements a **dual-track SLA architecture**:
1. **Modern SLA System** (`SLAPolicy`, `SLATimer`, `SLABreach`) - Database-driven, policy-based, with workflow integration
2. **Legacy SLA Monitoring** (`sla-monitor.js`) - Hardcoded thresholds, department-level JSON configs

### Key Findings
- ✅ **Policies stored in database** (`SLAPolicy` model)
- ⚠️ **Business hours defined but NOT enforced** in timer calculations
- ✅ **Timer pausing on status changes** (waiting, on_hold) implemented
- ⚠️ **No automated cron job** for SLA monitoring (manual endpoint exists)
- ✅ **Two timer types**: Response and Resolution (separate tracking)
- ⚠️ **Legacy system still active** alongside modern system (potential conflicts)

---

## 1. Database Layer Analysis

### 1.1 Schema Structure

#### **SLAPolicy Model** (`prisma/schema.prisma:703-735`)
```prisma
model SLAPolicy {
  id                   String        @id @default(cuid())
  name                 String
  description          String?
  isDefault            Boolean       @default(false)
  isActive             Boolean       @default(true)
  
  // Priority-based Response Times (in minutes)
  lowResponseTime      Int?          @default(480)    // 8 hours
  lowResolutionTime    Int?          @default(2880)  // 48 hours
  mediumResponseTime   Int?          @default(240)   // 4 hours
  mediumResolutionTime Int?          @default(1440)  // 24 hours
  highResponseTime     Int?          @default(60)    // 1 hour
  highResolutionTime   Int?          @default(480)   // 8 hours
  urgentResponseTime   Int?          @default(15)    // 15 minutes
  urgentResolutionTime Int?          @default(240)   // 4 hours
  
  // Business Hours Configuration
  useBusinessHours     Boolean       @default(true)
  businessHours        String?       // JSON: { "monday": "09:00-17:00", ... }
  timezone             String        @default("UTC")
  holidays             String?       // JSON array of dates
  
  // Escalation Thresholds (percentage)
  escalationLevel1     Int           @default(80)    // 80% elapsed
  escalationLevel2     Int           @default(95)    // 95% elapsed
  
  // Pause Conditions
  pauseOnWaiting       Boolean       @default(true)  // Pause when status = "waiting"
  pauseOnHold          Boolean       @default(true)  // Pause when status = "on_hold"
  pauseOffHours        Boolean       @default(true)  // Pause outside business hours
  
  // Policy Filters
  departmentIds        String?       // JSON array
  categoryIds          String?       // JSON array
  
  // Relations
  timers               SLATimer[]
  workflows            SLAWorkflow[]
}
```

**Key Observations:**
- ✅ Policies are **database-driven** (not hardcoded)
- ✅ **Priority-based times** configured per policy
- ✅ **Business hours fields exist** but implementation status unclear
- ✅ **Escalation thresholds** configurable (80%, 95%)
- ✅ **Pause conditions** configurable per policy

#### **SLATimer Model** (`prisma/schema.prisma:755-784`)
```prisma
model SLATimer {
  id               String      @id @default(cuid())
  conversationId   String      // Ticket ID
  policyId         String      // Reference to SLAPolicy
  timerType        String      // 'response' or 'resolution'
  status           String      @default("running") // 'running', 'paused', 'breached', 'stopped'
  
  // Time Tracking
  targetTime       Int         // Target duration in minutes
  elapsedTime      Int         @default(0)
  remainingTime    Int
  startedAt        DateTime    @default(now())
  pausedAt         DateTime?
  resumedAt        DateTime?
  completedAt      DateTime?
  breachedAt       DateTime?
  totalPausedTime  Int         @default(0)  // Total paused duration in minutes
  pauseReason      String?
  
  // Escalation Tracking
  level1NotifiedAt DateTime?   // 80% threshold
  level2NotifiedAt DateTime?   // 95% threshold
  breachNotifiedAt DateTime?
  
  // Metadata
  initialPriority  String      // Priority when timer started
  
  // Relations
  policy           SLAPolicy   @relation(...)
  breaches         SLABreach[]
}
```

**Key Observations:**
- ✅ **Two timers per ticket**: Response and Resolution (separate records)
- ✅ **Pause tracking** implemented (`pausedAt`, `resumedAt`, `totalPausedTime`)
- ✅ **Escalation tracking** per threshold level
- ⚠️ **No business hours calculation** in timer fields (relies on policy config)

#### **SLABreach Model** (`prisma/schema.prisma:786-807`)
```prisma
model SLABreach {
  id                String    @id @default(cuid())
  timerId           String
  conversationId    String
  breachType        String    // 'response_breach' or 'resolution_breach'
  targetTime        Int       // Expected time in minutes
  actualTime        Int       // Actual time elapsed in minutes
  breachTime        Int       // Overrun: actualTime - targetTime
  priority          String
  status            String
  assignedTo        String?   // Agent ID at time of breach (for reporting)
  department        String?
  notificationsSent String?   // JSON array of notification IDs
  breachedAt        DateTime  @default(now())
  resolvedAt        DateTime?
}
```

**Key Observations:**
- ✅ **Breach records** created for audit/reporting
- ✅ **Breach type** distinguishes Response vs Resolution
- ✅ **Historical tracking** of who was assigned at breach time

#### **Department SLA Config** (Legacy System)
```prisma
model Department {
  slaConfig         String?   // JSON: { "firstResponseTime": 4, "resolutionTime": { "high": 24, "medium": 48, "low": 72 } }
  workingHours      String?   // JSON format (unused in modern system)
  holidays          String?   // JSON format (unused in modern system)
}
```

**Key Observations:**
- ⚠️ **Legacy system** still uses `Department.slaConfig` (JSON string)
- ⚠️ **Dual configuration** creates potential conflicts
- ⚠️ **Working hours/holidays** in Department model not used by modern system

---

## 2. Logic & Calculation Analysis

### 2.1 Timer Initialization

#### **Entry Point: Ticket Creation**
**File:** `pages/api/admin/tickets/index.js:1405-1417`

```javascript
// Start SLA timers for the new ticket
try {
  const { SLAService } = await import('../../../../lib/sla-service');
  await SLAService.startTimers(
    conversation.ticketNumber,
    priority || 'low',
    conversation.departmentId || null,
    category || 'WZATCO'
  );
} catch (slaError) {
  console.error('Error starting SLA timers:', slaError);
  // Does NOT fail ticket creation if SLA timer start fails
}
```

**Flow:**
1. Ticket created → `SLAService.startTimers()` called
2. Finds applicable policy via `findApplicablePolicy()`
3. Gets response/resolution times based on priority
4. Creates two `SLATimer` records (response + resolution)

#### **Policy Selection Logic**
**File:** `lib/sla-service.js:73-112`

```javascript
static async findApplicablePolicy(departmentId, category) {
  // 1. Get all active policies
  const policies = await prisma.sLAPolicy.findMany({
    where: { isActive: true },
    orderBy: { isDefault: 'desc' } // Check default last
  });

  // 2. Find policy matching filters
  for (const policy of policies) {
    const policyDepartments = policy.departmentIds 
      ? JSON.parse(policy.departmentIds) 
      : null;
    const policyCategories = policy.categoryIds 
      ? JSON.parse(policy.categoryIds) 
      : null;

    const departmentMatch = !policyDepartments || 
      (departmentId && policyDepartments.includes(departmentId));
    const categoryMatch = !policyCategories || 
      (category && policyCategories.includes(category));

    if (departmentMatch && categoryMatch) {
      return policy; // First match wins
    }
  }

  // 3. Fallback to default policy
  return policies.find(p => p.isDefault) || null;
}
```

**Key Observations:**
- ✅ **Filter-based matching** (department, category)
- ✅ **Default policy fallback** if no match
- ⚠️ **First match wins** (no priority ordering beyond default flag)

#### **Time Calculation**
**File:** `lib/sla-service.js:117-138`

```javascript
static getResponseTime(policy, priority) {
  const priorityMap = {
    'low': policy.lowResponseTime,      // Default: 480 min (8h)
    'medium': policy.mediumResponseTime, // Default: 240 min (4h)
    'high': policy.highResponseTime,      // Default: 60 min (1h)
    'urgent': policy.urgentResponseTime, // Default: 15 min
  };
  return priorityMap[priority.toLowerCase()] || null;
}

static getResolutionTime(policy, priority) {
  const priorityMap = {
    'low': policy.lowResolutionTime,      // Default: 2880 min (48h)
    'medium': policy.mediumResolutionTime, // Default: 1440 min (24h)
    'high': policy.highResolutionTime,   // Default: 480 min (8h)
    'urgent': policy.urgentResolutionTime, // Default: 240 min (4h)
  };
  return priorityMap[priority.toLowerCase()] || null;
}
```

**Current Policy Defaults:**
| Priority | Response Time | Resolution Time |
|----------|--------------|-----------------|
| Urgent   | 15 minutes   | 4 hours         |
| High     | 1 hour       | 8 hours         |
| Medium   | 4 hours      | 24 hours        |
| Low      | 8 hours      | 48 hours        |

---

### 2.2 Timer Calculation & Elapsed Time

#### **Elapsed Time Calculation**
**File:** `lib/sla-service.js:167-218`

```javascript
static async checkTimer(timer) {
  const now = new Date();
  const startedAt = new Date(timer.startedAt);
  
  // Calculate elapsed time accounting for paused time
  let elapsedMinutes = Math.floor((now - startedAt) / 60000);
  
  // Subtract time since pause (if currently paused)
  if (timer.pausedAt && timer.status === 'paused') {
    const pausedAt = new Date(timer.pausedAt);
    elapsedMinutes -= Math.floor((now - pausedAt) / 60000);
  }
  
  // Subtract total paused time (historical pauses)
  elapsedMinutes -= timer.totalPausedTime;
  elapsedMinutes = Math.max(0, elapsedMinutes); // Ensure non-negative
  
  const percentageElapsed = Math.min(100, (elapsedMinutes / timer.targetTime) * 100);
  
  // Check for breach (100% elapsed)
  if (percentageElapsed >= 100 && timer.status === 'running') {
    await this.handleBreach(timer, elapsedMinutes);
    return;
  }
  
  // Check escalation thresholds
  if (percentageElapsed >= timer.policy.escalationLevel2 && !timer.level2NotifiedAt) {
    await this.sendEscalationNotification(timer, 2, percentageElapsed);
  }
  
  if (percentageElapsed >= timer.policy.escalationLevel1 && !timer.level1NotifiedAt) {
    await this.sendEscalationNotification(timer, 1, percentageElapsed);
  }
  
  // Update remaining time
  await prisma.sLATimer.update({
    where: { id: timer.id },
    data: {
      elapsedTime: elapsedMinutes,
      remainingTime: timer.targetTime - elapsedMinutes,
    },
  });
}
```

**Key Observations:**
- ✅ **Pause time accounted for** (subtracts paused duration)
- ⚠️ **Business hours NOT enforced** - uses wall-clock time
- ✅ **Percentage calculation** for escalation thresholds
- ✅ **Remaining time updated** on each check

#### **Business Hours Gap**
**Issue:** Policy has `useBusinessHours`, `businessHours`, `pauseOffHours` fields, but:
- ❌ **Timer calculation does NOT check business hours**
- ❌ **No logic to pause timers outside business hours**
- ❌ **No logic to resume timers when business hours start**

**Expected Behavior (Not Implemented):**
```javascript
// SHOULD check if current time is within business hours
if (policy.useBusinessHours && policy.pauseOffHours) {
  const isBusinessHours = checkBusinessHours(now, policy.businessHours, policy.timezone);
  if (!isBusinessHours && timer.status === 'running') {
    await this.pauseTimer(timer.conversationId, 'Outside business hours');
  }
}
```

---

### 2.3 Pause/Resume Logic

#### **Pause Conditions**
**File:** `lib/sla-service.js:489-522`

```javascript
static async checkPauseConditions(conversationId, status, policy) {
  const timers = await prisma.sLATimer.findMany({
    where: {
      conversationId,
      status: { in: ['running', 'paused'] }
    }
  });

  if (timers.length === 0) return;

  const shouldPause = 
    (policy.pauseOnWaiting && status === 'waiting') ||
    (policy.pauseOnHold && status === 'on_hold');

  // Pause if conditions are met
  if (shouldPause) {
    const runningTimers = timers.filter(t => t.status === 'running');
    if (runningTimers.length > 0) {
      await this.pauseTimer(conversationId, `Status changed to ${status}`);
    }
  } 
  // Resume if conditions are not met
  else {
    const pausedTimers = timers.filter(t => t.status === 'paused');
    if (pausedTimers.length > 0) {
      await this.resumeTimer(conversationId);
    }
  }
}
```

**Integration Point:**
**File:** `pages/api/admin/tickets/[id].js:384`

```javascript
// Handle SLA timer pause/resume/stop based on status change
if (status !== undefined && status !== currentTicket.status) {
  // ... status update logic ...
  
  // Get policy for pause conditions
  const timers = await prisma.sLATimer.findMany({
    where: { conversationId: currentTicket.ticketNumber }
  });
  
  if (timers.length > 0) {
    const policy = await prisma.sLAPolicy.findUnique({
      where: { id: timers[0].policyId }
    });
    
    if (policy) {
      await SLAService.checkPauseConditions(
        currentTicket.ticketNumber, 
        status, 
        policy
      );
    }
  }
  
  // Stop timers if resolved/closed
  if (status === 'resolved' || status === 'closed') {
    await SLAService.stopTimer(currentTicket.ticketNumber);
  }
}
```

**Key Observations:**
- ✅ **Pause on "waiting" status** implemented (if `pauseOnWaiting = true`)
- ✅ **Pause on "on_hold" status** implemented (if `pauseOnHold = true`)
- ✅ **Auto-resume** when status changes back to active
- ✅ **Auto-stop** when ticket resolved/closed
- ⚠️ **Business hours pausing NOT implemented** (despite policy flag)

---

### 2.4 First Response vs Resolution SLA

#### **Two Separate Timers**
The system creates **two independent timers** per ticket:

1. **Response Timer** (`timerType: 'response'`)
   - Starts: When ticket is created
   - Stops: When `firstResponseAt` is set (first agent message)
   - Purpose: Track time to first agent response

2. **Resolution Timer** (`timerType: 'resolution'`)
   - Starts: When ticket is created
   - Stops: When ticket status = 'resolved' or 'closed'
   - Purpose: Track time to ticket resolution

#### **First Response Tracking**
**File:** `lib/utils/sla-monitor.js:244-278`

```javascript
// Check First Response SLA Risk
if (!ticket.firstResponseAt && ticket.firstResponseTimeSeconds === null) {
  const timeRemaining = firstResponseSLA - ticketAge;
  const riskThreshold = firstResponseSLA * FIRST_RESPONSE_RISK_THRESHOLD;

  if (timeRemaining > 0 && timeRemaining <= riskThreshold) {
    // Send notification
  }
}
```

**Key Observations:**
- ✅ **Separate tracking** for first response
- ⚠️ **Legacy system** uses `firstResponseAt` field (not `SLATimer`)
- ⚠️ **Dual tracking** creates potential inconsistency

---

## 3. Enforcement & Automation Analysis

### 3.1 Breach Detection

#### **Breach Detection Logic**
**File:** `lib/sla-service.js:223-279`

```javascript
static async handleBreach(timer, actualTime) {
  // 1. Mark timer as breached
  await prisma.sLATimer.update({
    where: { id: timer.id },
    data: {
      status: 'breached',
      breachedAt: new Date(),
    },
  });

  // 2. Create breach record
  const breach = await prisma.sLABreach.create({
    data: {
      timerId: timer.id,
      conversationId: timer.conversationId,
      breachType: timer.timerType === 'response' ? 'response_breach' : 'resolution_breach',
      targetTime: timer.targetTime,
      actualTime,
      breachTime: actualTime - timer.targetTime,
      priority: ticket?.priority || 'unknown',
      status: ticket?.status || 'unknown',
      assignedTo: ticket?.assigneeId,
      department: ticket?.departmentId,
    },
  });

  // 3. Send breach notification
  await this.sendBreachNotification(timer, breach);

  // 4. Create escalation event
  await prisma.sLAEscalation.create({
    data: {
      conversationId: timer.conversationId,
      timerId: timer.id,
      escalationLevel: 3,
      escalationType: 'sla_breach',
      reason: `SLA ${timer.timerType} time breached by ${actualTime - timer.targetTime} minutes`,
    },
  });
}
```

**Key Observations:**
- ✅ **Breach detection** happens in `checkTimer()` when `percentageElapsed >= 100`
- ✅ **Breach record created** for audit trail
- ✅ **Notifications sent** to assigned agent and admins
- ✅ **Escalation event created** for reporting

---

### 3.2 Monitoring & Automation

#### **SLA Monitor Service**
**File:** `lib/sla-service.js:143-162`

```javascript
static async monitorTimers() {
  const activeTimers = await prisma.sLATimer.findMany({
    where: { status: 'running' },
    include: { policy: true },
  });

  for (const timer of activeTimers) {
    await this.checkTimer(timer);
  }

  console.log(`Monitored ${activeTimers.length} active SLA timers`);
}
```

#### **Monitor API Endpoint**
**File:** `pages/api/admin/sla/monitor.js`

```javascript
export default async function handler(req, res) {
  if (req.method === 'POST') {
    await SLAService.monitorTimers();
    return res.status(200).json({
      success: true,
      message: 'SLA monitoring completed',
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Key Observations:**
- ✅ **Monitor function exists** (`SLAService.monitorTimers()`)
- ⚠️ **No automated cron job** configured
- ⚠️ **Manual trigger only** (POST to `/api/admin/sla/monitor`)
- ⚠️ **No scheduled execution** (requires external cron or manual call)

#### **Recommended Cron Setup**
**Missing:** Automated scheduled execution

**Should be:**
```json
// vercel.json (if using Vercel)
{
  "crons": [{
    "path": "/api/admin/sla/monitor",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}
```

Or external cron service calling:
```
POST /api/admin/sla/monitor
```

---

### 3.3 Escalation Notifications

#### **Escalation Levels**
**File:** `lib/sla-service.js:189-205`

```javascript
// Check Level 2 escalation (95%)
if (percentageElapsed >= timer.policy.escalationLevel2 && !timer.level2NotifiedAt) {
  await this.sendEscalationNotification(timer, 2, percentageElapsed);
  await prisma.sLATimer.update({
    where: { id: timer.id },
    data: { level2NotifiedAt: now },
  });
}

// Check Level 1 escalation (80%)
if (percentageElapsed >= timer.policy.escalationLevel1 && !timer.level1NotifiedAt) {
  await this.sendEscalationNotification(timer, 1, percentageElapsed);
  await prisma.sLATimer.update({
    where: { id: timer.id },
    data: { level1NotifiedAt: now },
  });
}
```

#### **Notification Sending**
**File:** `lib/sla-service.js:379-418`

```javascript
static async sendEscalationNotification(timer, level, percentage) {
  const ticket = await prisma.conversation.findUnique({
    where: { ticketNumber: timer.conversationId },
    select: {
      ticketNumber: true,
      subject: true,
      assigneeId: true,
      priority: true,
    },
  });

  const levelText = level === 1 ? 'Warning' : 'Critical';
  const title = `SLA ${levelText}: ${timer.timerType} timer at ${percentage.toFixed(0)}%`;
  const message = `Ticket ${ticket?.ticketNumber} is at ${percentage.toFixed(0)}% of its ${timer.timerType} time limit`;

  // Create notification for assigned agent
  if (ticket?.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: ticket.assigneeId,
        type: 'sla_risk',
        title,
        message,
        link: `/admin/tickets/${timer.conversationId}`,
        metadata: JSON.stringify({
          conversationId: timer.conversationId,
          timerId: timer.id,
          escalationLevel: level,
        }),
      },
    });
  }
}
```

**Key Observations:**
- ✅ **Two escalation levels** (80%, 95%)
- ✅ **One-time notifications** (tracked via `level1NotifiedAt`, `level2NotifiedAt`)
- ⚠️ **Only notifies assigned agent** (no supervisor escalation)
- ⚠️ **No notification if ticket unassigned** (`assigneeId` null)

---

## 4. Integration Points

### 4.1 Ticket Creation Integration

**File:** `pages/api/admin/tickets/index.js:1405-1417`

```javascript
// Start SLA timers for the new ticket
try {
  const { SLAService } = await import('../../../../lib/sla-service');
  await SLAService.startTimers(
    conversation.ticketNumber,
    priority || 'low',
    conversation.departmentId || null,
    category || 'WZATCO'
  );
} catch (slaError) {
  console.error('Error starting SLA timers:', slaError);
  // Does NOT fail ticket creation if SLA timer start fails
}
```

**Key Observations:**
- ✅ **Automatic timer start** on ticket creation
- ✅ **Error handling** (doesn't block ticket creation)
- ✅ **Uses ticket priority** for time calculation

---

### 4.2 Ticket Update Integration

**File:** `pages/api/admin/tickets/[id].js:349-395`

```javascript
// Handle SLA timer pause/resume/stop based on status change
if (status !== undefined && status !== currentTicket.status) {
  // ... status update logic ...
  
  // Get policy for pause conditions
  const timers = await prisma.sLATimer.findMany({
    where: { conversationId: currentTicket.ticketNumber }
  });
  
  if (timers.length > 0) {
    const policy = await prisma.sLAPolicy.findUnique({
      where: { id: timers[0].policyId }
    });
    
    if (policy) {
      await SLAService.checkPauseConditions(
        currentTicket.ticketNumber, 
        status, 
        policy
      );
    }
  }
  
  // Stop timers if resolved/closed
  if (status === 'resolved' || status === 'closed') {
    await SLAService.stopTimer(currentTicket.ticketNumber);
  }
}
```

**Key Observations:**
- ✅ **Status change triggers pause/resume**
- ✅ **Resolution stops timers**
- ⚠️ **Priority change does NOT update timer** (timer uses `initialPriority`)

---

### 4.3 Workflow Integration

#### **Workflow Trigger on Ticket Creation**
**File:** `lib/workflow-triggers.js:13-76`

```javascript
static async onTicketCreated(ticket) {
  // Find all active workflows with ticket_created trigger
  const workflows = await prisma.sLAWorkflow.findMany({
    where: { isActive: true, isDraft: false }
  });

  for (const workflow of workflows) {
    const workflowData = JSON.parse(workflow.workflowData);
    const triggerNode = nodes.find(node => node.data.id === 'ticket_created');
    
    if (triggerNode && this.matchesFilters(ticket, config)) {
      const context = {
        conversationId: ticket.ticketNumber,
        priority: ticket.priority,
        policyId: workflow.policyId,
        // ...
      };
      
      await WorkflowExecutor.executeWorkflow(workflow.id, context);
    }
  }
}
```

#### **Workflow SLA Timer Node**
**File:** `lib/workflow-executor.js:201-308`

```javascript
static async executeStartSLATimer(config, context, workflow) {
  // Fetch policy from database
  const policy = await prisma.sLAPolicy.findUnique({
    where: { id: workflow.policyId }
  });

  if (policy) {
    // Use actual policy times based on ticket priority
    responseDuration = SLAService.getResponseTime(policy, ticketPriority);
    resolutionDuration = SLAService.getResolutionTime(policy, ticketPriority);
  }
  
  // Create timers
  const responseTimer = await prisma.sLATimer.create({ ... });
  const resolutionTimer = await prisma.sLATimer.create({ ... });
}
```

**Key Observations:**
- ✅ **Workflows can start SLA timers** via "Start SLA Timer" node
- ✅ **Uses policy from workflow** (not hardcoded)
- ⚠️ **Potential duplicate timers** if both API and workflow start timers

---

## 5. Legacy System Analysis

### 5.1 Legacy SLA Monitor

**File:** `lib/utils/sla-monitor.js`

This is a **separate, parallel system** that:
- Uses **hardcoded defaults** (4h first response, 24/48/72h resolution)
- Reads **department-level JSON config** (`Department.slaConfig`)
- Calculates **risk thresholds** (25% for first response, 20% for resolution)
- Sends **notifications via `notifySLARisk()`**

**Key Differences:**
| Feature | Modern System | Legacy System |
|---------|--------------|---------------|
| Policy Source | `SLAPolicy` table | `Department.slaConfig` (JSON) |
| Timer Storage | `SLATimer` records | Calculated on-the-fly |
| Breach Tracking | `SLABreach` records | No breach records |
| Escalation | 80%, 95% thresholds | 25%, 20% risk thresholds |
| Business Hours | Policy flag (not enforced) | Not supported |

**Potential Conflicts:**
- ⚠️ **Dual notifications** if both systems are active
- ⚠️ **Inconsistent thresholds** between systems
- ⚠️ **No synchronization** between systems

---

## 6. Gaps & Missing Logic

### 6.1 Business Hours Enforcement

**Status:** ❌ **NOT IMPLEMENTED**

**Policy Fields Exist:**
- `useBusinessHours: Boolean`
- `businessHours: String?` (JSON format)
- `pauseOffHours: Boolean`
- `timezone: String`

**Missing Implementation:**
- ❌ No function to parse `businessHours` JSON
- ❌ No function to check if current time is within business hours
- ❌ No logic to pause timers outside business hours
- ❌ No logic to resume timers when business hours start
- ❌ No holiday checking logic

**Expected Implementation:**
```javascript
// SHOULD exist in lib/sla-service.js
static isWithinBusinessHours(now, policy) {
  if (!policy.useBusinessHours) return true;
  
  const businessHours = JSON.parse(policy.businessHours || '{}');
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const daySchedule = businessHours[dayName];
  
  if (!daySchedule) return false; // No schedule = closed
  
  const [start, end] = daySchedule.split('-');
  const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
  
  return currentTime >= start && currentTime <= end;
}

static async checkBusinessHoursPause(timer) {
  const policy = timer.policy;
  
  if (policy.useBusinessHours && policy.pauseOffHours) {
    const now = new Date();
    const isBusinessHours = this.isWithinBusinessHours(now, policy);
    
    if (!isBusinessHours && timer.status === 'running') {
      await this.pauseTimer(timer.conversationId, 'Outside business hours');
    } else if (isBusinessHours && timer.status === 'paused' && timer.pauseReason === 'Outside business hours') {
      await this.resumeTimer(timer.conversationId);
    }
  }
}
```

---

### 6.2 Priority Change Handling

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

**Current Behavior:**
- Timer uses `initialPriority` (priority at creation)
- Priority change does NOT update timer target times
- Timer continues with original priority's time limits

**Expected Behavior:**
- When priority changes, recalculate remaining time based on new priority
- Or create new timer with new priority's times
- Or adjust `targetTime` proportionally

**Missing Implementation:**
```javascript
// SHOULD exist in pages/api/admin/tickets/[id].js
if (priority !== undefined && priority !== currentTicket.priority) {
  // Recalculate SLA timers for new priority
  const timers = await prisma.sLATimer.findMany({
    where: {
      conversationId: currentTicket.ticketNumber,
      status: { in: ['running', 'paused'] }
    }
  });
  
  for (const timer of timers) {
    const policy = await prisma.sLAPolicy.findUnique({
      where: { id: timer.policyId }
    });
    
    const newTargetTime = timer.timerType === 'response'
      ? SLAService.getResponseTime(policy, priority)
      : SLAService.getResolutionTime(policy, priority);
    
    // Adjust remaining time proportionally
    const elapsedRatio = timer.elapsedTime / timer.targetTime;
    const newRemainingTime = newTargetTime * (1 - elapsedRatio);
    
    await prisma.sLATimer.update({
      where: { id: timer.id },
      data: {
        targetTime: newTargetTime,
        remainingTime: Math.max(0, newRemainingTime),
      }
    });
  }
}
```

---

### 6.3 Automated Monitoring

**Status:** ⚠️ **MANUAL ONLY**

**Current State:**
- Monitor endpoint exists: `/api/admin/sla/monitor`
- No automated cron job configured
- Requires manual POST request or external scheduler

**Missing:**
- ❌ No `vercel.json` cron configuration
- ❌ No scheduled job setup
- ❌ No documentation on how to schedule monitoring

**Recommended:**
1. Add cron job configuration
2. Or document external scheduler setup
3. Or implement in-app scheduler (if using Node.js cron library)

---

### 6.4 Unassigned Ticket Notifications

**Status:** ⚠️ **NOTIFICATIONS SKIPPED**

**Current Behavior:**
**File:** `lib/sla-service.js:397-412`

```javascript
// Create notification for assigned agent
if (ticket?.assigneeId) {
  await prisma.notification.create({ ... });
}
// ⚠️ No else clause - unassigned tickets get no notifications
```

**Missing Implementation:**
- ❌ No notification to department supervisors
- ❌ No notification to admins
- ❌ Unassigned tickets can breach without alerting anyone

**Expected Implementation:**
```javascript
if (ticket?.assigneeId) {
  // Notify assigned agent
  await prisma.notification.create({ ... });
} else {
  // Notify department supervisors or admins
  const supervisors = await prisma.agent.findMany({
    where: {
      departmentId: ticket.departmentId,
      role: { hasSuperPower: true }
    }
  });
  
  for (const supervisor of supervisors) {
    await prisma.notification.create({
      userId: supervisor.id,
      type: 'sla_risk',
      title: `Unassigned Ticket SLA Risk: ${ticket.ticketNumber}`,
      // ...
    });
  }
}
```

---

## 7. Lifecycle: Ticket Created → SLA Breached

### Complete Code Path

#### **Step 1: Ticket Creation**
```
POST /api/admin/tickets
  ↓
pages/api/admin/tickets/index.js:handlePost()
  ↓
conversation = await prisma.conversation.create({ ... })
  ↓
SLAService.startTimers(conversationId, priority, departmentId, category)
```

#### **Step 2: Policy Selection**
```
SLAService.findApplicablePolicy(departmentId, category)
  ↓
Query: SELECT * FROM SLAPolicy WHERE isActive = true ORDER BY isDefault DESC
  ↓
Filter by departmentIds, categoryIds
  ↓
Return: First matching policy OR default policy
```

#### **Step 3: Timer Creation**
```
SLAService.getResponseTime(policy, priority)  // e.g., 60 min for "high"
SLAService.getResolutionTime(policy, priority) // e.g., 480 min for "high"
  ↓
prisma.sLATimer.create({ timerType: 'response', targetTime: 60, ... })
prisma.sLATimer.create({ timerType: 'resolution', targetTime: 480, ... })
```

#### **Step 4: Timer Monitoring** (Manual or Scheduled)
```
POST /api/admin/sla/monitor (or cron job)
  ↓
SLAService.monitorTimers()
  ↓
Query: SELECT * FROM SLATimer WHERE status = 'running'
  ↓
For each timer: SLAService.checkTimer(timer)
```

#### **Step 5: Elapsed Time Calculation**
```
checkTimer(timer)
  ↓
elapsedMinutes = (now - startedAt) / 60000
  ↓
if (paused) elapsedMinutes -= (now - pausedAt) / 60000
  ↓
elapsedMinutes -= totalPausedTime
  ↓
percentageElapsed = (elapsedMinutes / targetTime) * 100
```

#### **Step 6: Escalation Checks**
```
if (percentageElapsed >= 80% && !level1NotifiedAt)
  → sendEscalationNotification(timer, 1, percentage)
  → Update: level1NotifiedAt = now

if (percentageElapsed >= 95% && !level2NotifiedAt)
  → sendEscalationNotification(timer, 2, percentage)
  → Update: level2NotifiedAt = now
```

#### **Step 7: Breach Detection**
```
if (percentageElapsed >= 100% && status === 'running')
  → handleBreach(timer, elapsedMinutes)
    ↓
    Update: status = 'breached', breachedAt = now
    ↓
    Create: SLABreach record
    ↓
    sendBreachNotification(timer, breach)
    ↓
    Create: SLAEscalation record (level 3)
```

#### **Step 8: Status Change Handling**
```
PATCH /api/admin/tickets/[id] { status: 'waiting' }
  ↓
pages/api/admin/tickets/[id].js:handlePatch()
  ↓
SLAService.checkPauseConditions(conversationId, 'waiting', policy)
  ↓
if (policy.pauseOnWaiting === true)
  → pauseTimer(conversationId, 'Status changed to waiting')
    ↓
    Update: status = 'paused', pausedAt = now, pauseReason = '...'
```

#### **Step 9: Resolution**
```
PATCH /api/admin/tickets/[id] { status: 'resolved' }
  ↓
SLAService.stopTimer(conversationId)
  ↓
Update: status = 'stopped', completedAt = now
```

---

## 8. Summary of Gaps

### Critical Gaps (Must Fix)

1. **Business Hours Enforcement** ❌
   - Policy fields exist but not implemented
   - Timers run 24/7 regardless of business hours setting
   - **Impact:** Incorrect SLA calculations for business-hours-only policies

2. **Automated Monitoring** ⚠️
   - No cron job configured
   - Manual trigger only
   - **Impact:** Breaches may not be detected in real-time

3. **Unassigned Ticket Notifications** ⚠️
   - No notifications sent when ticket is unassigned
   - **Impact:** Unassigned tickets can breach without alerting anyone

### Medium Priority Gaps

4. **Priority Change Handling** ⚠️
   - Timer uses initial priority, doesn't update on priority change
   - **Impact:** Priority escalation doesn't adjust SLA times

5. **Legacy System Coexistence** ⚠️
   - Two parallel systems (modern + legacy)
   - Potential duplicate notifications
   - **Impact:** Confusion, inconsistent behavior

### Low Priority Gaps

6. **Holiday Support** ❌
   - Policy has `holidays` field but not used
   - **Impact:** Timers run on holidays even if configured not to

7. **Workflow Duplicate Timers** ⚠️
   - Both API and workflow can start timers
   - **Impact:** Potential duplicate timer records

---

## 9. Recommendations

### Immediate Actions

1. **Implement Business Hours Logic**
   - Add `isWithinBusinessHours()` function
   - Integrate into `checkTimer()` and `monitorTimers()`
   - Auto-pause/resume based on business hours

2. **Set Up Automated Monitoring**
   - Configure cron job (Vercel or external)
   - Run every 5 minutes: `*/5 * * * *`
   - Document setup process

3. **Fix Unassigned Ticket Notifications**
   - Send notifications to department supervisors when ticket is unassigned
   - Or send to all admins

### Short-Term Improvements

4. **Handle Priority Changes**
   - Recalculate timer times when priority changes
   - Or create new timer with new priority's times

5. **Deprecate Legacy System**
   - Migrate all tickets to modern SLA system
   - Remove `Department.slaConfig` usage
   - Consolidate to single system

6. **Add Holiday Support**
   - Parse `holidays` JSON from policy
   - Pause timers on holidays if configured

### Long-Term Enhancements

7. **SLA Reporting Dashboard**
   - Real-time SLA status visualization
   - Breach trend analysis
   - Policy effectiveness metrics

8. **Advanced Escalation Rules**
   - Custom escalation levels per policy
   - Escalate to supervisors at certain thresholds
   - Auto-reassign on breach

9. **SLA Analytics**
   - Historical breach analysis
   - Average resolution times by priority
   - Policy optimization recommendations

---

## 10. Policy Definitions (Current Defaults)

### Default SLAPolicy Times

| Priority | Response Time | Resolution Time |
|----------|--------------|-----------------|
| **Urgent** | 15 minutes | 4 hours (240 min) |
| **High** | 1 hour (60 min) | 8 hours (480 min) |
| **Medium** | 4 hours (240 min) | 24 hours (1440 min) |
| **Low** | 8 hours (480 min) | 48 hours (2880 min) |

### Escalation Thresholds

- **Level 1 (Warning):** 80% elapsed
- **Level 2 (Critical):** 95% elapsed
- **Level 3 (Breach):** 100% elapsed

### Pause Conditions (Default)

- ✅ Pause on "waiting" status (`pauseOnWaiting: true`)
- ✅ Pause on "on_hold" status (`pauseOnHold: true`)
- ⚠️ Pause outside business hours (`pauseOffHours: true`) - **NOT IMPLEMENTED**

---

## 11. File Reference

### Core SLA Files
- `lib/sla-service.js` - Main SLA service (timer management)
- `lib/utils/sla-monitor.js` - Legacy SLA monitoring (risk alerts)
- `pages/api/admin/sla/monitor.js` - Monitor API endpoint
- `pages/api/admin/sla/check.js` - Single ticket SLA check

### Integration Points
- `pages/api/admin/tickets/index.js` - Ticket creation (starts timers)
- `pages/api/admin/tickets/[id].js` - Ticket updates (pause/resume/stop)
- `lib/workflow-triggers.js` - Workflow trigger system
- `lib/workflow-executor.js` - Workflow execution (SLA timer nodes)

### Database Schema
- `prisma/schema.prisma` - All SLA models (SLAPolicy, SLATimer, SLABreach, etc.)

### Documentation
- `SLA_POLICY_INTEGRATION_FIX.md` - Policy integration fix notes
- `SLA_WORKFLOW_LEAVE_ANALYSIS.md` - Leave management impact analysis
- `SLA_QUICKSTART.md` - Quick start guide
- `SLA_IMPLEMENTATION_GUIDE.md` - Implementation guide

---

## ✅ Conclusion

The SLA system has a **solid foundation** with:
- ✅ Database-driven policies
- ✅ Separate Response and Resolution timers
- ✅ Pause/resume on status changes
- ✅ Escalation notifications
- ✅ Breach tracking

However, **critical gaps** exist:
- ❌ Business hours not enforced
- ⚠️ No automated monitoring
- ⚠️ Unassigned tickets get no notifications
- ⚠️ Priority changes don't update timers

**Priority:** Fix business hours enforcement and automated monitoring first, then address notification gaps and priority change handling.

---

**End of Audit Report**

