/**
 * WORKFLOW INTEGRATION EXAMPLE
 * 
 * This file shows how to integrate the workflow system into your ticket APIs
 * Copy these examples into your actual ticket API endpoints
 */

import { WorkflowTriggers } from '../lib/workflow-triggers';

// =================================================
// EXAMPLE 1: Ticket Creation API
// =================================================

// In your pages/api/tickets/create.js or similar:

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // ... your existing ticket creation logic ...
      
      const ticket = await prisma.conversation.create({
        data: {
          subject: req.body.subject,
          priority: req.body.priority,
          status: 'open',
          categoryId: req.body.categoryId,
          departmentId: req.body.departmentId,
          channel: req.body.channel,
          // ... other fields ...
        },
      });

      // ✅ ADD THIS: Trigger workflow execution
      WorkflowTriggers.onTicketCreated(ticket)
        .then(result => console.log('Workflows triggered:', result))
        .catch(error => console.error('Workflow trigger error:', error));

      // Return response
      return res.status(201).json({
        success: true,
        ticket,
      });

    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

// =================================================
// EXAMPLE 2: Ticket Update API
// =================================================

// In your pages/api/tickets/[id]/update.js or similar:

export default async function handler(req, res) {
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { id } = req.query;
      
      // Get original ticket
      const originalTicket = await prisma.conversation.findUnique({
        where: { id },
      });

      // Update ticket
      const updatedTicket = await prisma.conversation.update({
        where: { id },
        data: {
          priority: req.body.priority,
          status: req.body.status,
          assignedUserId: req.body.assignedUserId,
          // ... other fields ...
        },
      });

      // ✅ ADD THIS: Detect changes and trigger workflows
      const changes = {};
      if (originalTicket.priority !== updatedTicket.priority) {
        changes.priority = { old: originalTicket.priority, new: updatedTicket.priority };
      }
      if (originalTicket.status !== updatedTicket.status) {
        changes.status = { old: originalTicket.status, new: updatedTicket.status };
      }
      if (originalTicket.assignedUserId !== updatedTicket.assignedUserId) {
        changes.assignee = { old: originalTicket.assignedUserId, new: updatedTicket.assignedUserId };
      }

      // Trigger workflows if there were changes
      if (Object.keys(changes).length > 0) {
        WorkflowTriggers.onTicketUpdated(updatedTicket, changes)
          .then(result => console.log('Workflows triggered:', result))
          .catch(error => console.error('Workflow trigger error:', error));
      }

      return res.status(200).json({
        success: true,
        ticket: updatedTicket,
      });

    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

// =================================================
// EXAMPLE 3: Scheduled SLA Timer Check (Cron Job)
// =================================================

// Create a new file: pages/api/cron/check-sla-timers.js

import { WorkflowTriggers } from '../../../lib/workflow-triggers';

export default async function handler(req, res) {
  // Verify this is called by your cron service (e.g., Vercel Cron)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // Check SLA timers and trigger time-based workflows
    const result = await WorkflowTriggers.checkSLATimers();

    return res.status(200).json({
      success: true,
      message: 'SLA timers checked',
      result,
    });
  } catch (error) {
    console.error('SLA timer check error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// Then add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/check-sla-timers",
//     "schedule": "*/5 * * * *"  // Every 5 minutes
//   }]
// }

// =================================================
// EXAMPLE 4: Manual Workflow Execution (Testing)
// =================================================

// Create a test endpoint: pages/api/workflows/test.js

import { WorkflowExecutor } from '../../../lib/workflow-executor';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { workflowId, conversationId } = req.body;

      // Get ticket data
      const ticket = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      // Build context
      const context = {
        conversationId: ticket.id,
        priority: ticket.priority,
        status: ticket.status,
        ticket: ticket,
        event: 'manual_test',
      };

      // Execute workflow
      const result = await WorkflowExecutor.executeWorkflow(workflowId, context);

      return res.status(200).json({
        success: true,
        message: 'Workflow executed',
        result,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

// =================================================
// EXAMPLE 5: Status Change Auto-Actions
// =================================================

// When ticket status changes to "Waiting on Customer", pause SLA:

export async function onStatusChanged(ticket, oldStatus, newStatus) {
  // If moved to "Waiting on Customer", pause SLA
  if (newStatus === 'waiting_customer' && oldStatus !== 'waiting_customer') {
    await prisma.sLATimer.updateMany({
      where: {
        conversationId: ticket.id,
        status: 'running',
      },
      data: {
        status: 'paused',
        pausedAt: new Date(),
      },
    });
    console.log(`SLA paused for ticket ${ticket.id}`);
  }

  // If moved back to active, resume SLA
  if (oldStatus === 'waiting_customer' && newStatus === 'open') {
    await prisma.sLATimer.updateMany({
      where: {
        conversationId: ticket.id,
        status: 'paused',
      },
      data: {
        status: 'running',
        resumedAt: new Date(),
      },
    });
    console.log(`SLA resumed for ticket ${ticket.id}`);
  }
}

// =================================================
// EXAMPLE 6: Comment Reply Detection
// =================================================

// When agent replies to ticket, mark response SLA as met:

export async function onAgentReply(conversationId, message) {
  // Check if response SLA timer exists and is running
  const responseTimer = await prisma.sLATimer.findFirst({
    where: {
      conversationId,
      timerType: 'response',
      status: 'running',
    },
  });

  if (responseTimer) {
    // Mark as met
    await prisma.sLATimer.update({
      where: { id: responseTimer.id },
      data: {
        status: 'met',
        metAt: new Date(),
      },
    });
    
    console.log(`Response SLA met for ticket ${conversationId}`);
  }
}

// =================================================
// SUMMARY OF INTEGRATION STEPS:
// =================================================

/*
1. ✅ Install workflow execution engine (workflow-executor.js)
2. ✅ Install workflow triggers (workflow-triggers.js)
3. ✅ Add WorkflowTriggers.onTicketCreated() to ticket creation API
4. ✅ Add WorkflowTriggers.onTicketUpdated() to ticket update API
5. ✅ Set up cron job for WorkflowTriggers.checkSLATimers()
6. ✅ Add SLA pause/resume logic to status changes
7. ✅ Add response SLA met logic to agent replies
8. ✅ Test with manual workflow execution endpoint

Your workflows will now execute automatically based on:
- Ticket creation (with filters)
- Ticket updates (field changes)
- Time-based checks (SLA monitoring)
- Conditional logic (IF/THEN flows)
- Actions (notifications, assignments, field updates)
*/

