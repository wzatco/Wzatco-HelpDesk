/**
 * SLA Integration Examples
 * 
 * This file demonstrates how to integrate the SLA system with your ticket operations.
 * Copy and adapt these examples to your existing ticket management code.
 */

import SLAService from '../lib/sla-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Example 1: Start SLA when ticket is created
 */
async function onTicketCreated(ticketData) {
  try {
    // Create the ticket
    const ticket = await prisma.conversation.create({
      data: {
        siteId: ticketData.siteId,
        subject: ticketData.subject,
        priority: ticketData.priority || 'medium',
        status: 'open',
        customerId: ticketData.customerId,
        departmentId: ticketData.departmentId,
        category: ticketData.category,
      },
    });

    // Start SLA timers automatically
    await SLAService.startTimers(
      ticket.id,
      ticket.priority,
      ticket.departmentId,
      ticket.category
    );

    console.log(`Ticket ${ticket.id} created with SLA timers started`);
    return ticket;
  } catch (error) {
    console.error('Error creating ticket with SLA:', error);
    throw error;
  }
}

/**
 * Example 2: Pause SLA when waiting for customer
 */
async function onTicketStatusChanged(ticketId, newStatus, oldStatus) {
  try {
    // Update ticket status
    await prisma.conversation.update({
      where: { id: ticketId },
      data: { status: newStatus },
    });

    // Pause SLA if waiting for customer
    if (newStatus === 'waiting' || newStatus === 'pending_customer') {
      await SLAService.pauseTimer(ticketId, 'Waiting for customer response');
      console.log(`SLA paused for ticket ${ticketId}`);
    }

    // Resume SLA if status changed back to active
    if ((oldStatus === 'waiting' || oldStatus === 'pending_customer') && 
        (newStatus === 'open' || newStatus === 'in_progress')) {
      await SLAService.resumeTimer(ticketId);
      console.log(`SLA resumed for ticket ${ticketId}`);
    }

    // Stop SLA if ticket is resolved/closed
    if (newStatus === 'resolved' || newStatus === 'closed') {
      await SLAService.stopTimer(ticketId);
      console.log(`SLA stopped for ticket ${ticketId}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating ticket status with SLA:', error);
    throw error;
  }
}

/**
 * Example 3: Restart SLA when priority changes
 */
async function onTicketPriorityChanged(ticketId, newPriority, restartSLA = true) {
  try {
    // Get ticket details
    const ticket = await prisma.conversation.findUnique({
      where: { id: ticketId },
      select: { departmentId: true, category: true },
    });

    // Update priority
    await prisma.conversation.update({
      where: { id: ticketId },
      data: { priority: newPriority },
    });

    // Record activity
    await prisma.ticketActivity.create({
      data: {
        conversationId: ticketId,
        activityType: 'priority_changed',
        oldValue: 'previous_priority', // pass old priority
        newValue: newPriority,
        reason: 'Priority escalated due to urgency',
        performedBy: 'admin',
      },
    });

    if (restartSLA) {
      // Stop existing timers
      await SLAService.stopTimer(ticketId);

      // Start new timers with updated priority
      await SLAService.startTimers(
        ticketId,
        newPriority,
        ticket.departmentId,
        ticket.category
      );

      console.log(`SLA restarted for ticket ${ticketId} with priority ${newPriority}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating priority with SLA:', error);
    throw error;
  }
}

/**
 * Example 4: Handle first response (stops response timer)
 */
async function onAgentFirstResponse(ticketId, agentId, messageContent) {
  try {
    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: ticketId,
        senderId: agentId,
        senderType: 'agent',
        content: messageContent,
        type: 'text',
      },
    });

    // Check if this is the first response
    const ticket = await prisma.conversation.findUnique({
      where: { id: ticketId },
      select: { firstResponseAt: true, createdAt: true },
    });

    if (!ticket.firstResponseAt) {
      const responseTime = Math.floor(
        (new Date() - new Date(ticket.createdAt)) / 1000
      );

      // Update ticket with first response
      await prisma.conversation.update({
        where: { id: ticketId },
        data: {
          firstResponseAt: new Date(),
          firstResponseTimeSeconds: responseTime,
        },
      });

      // Stop only the response timer (resolution timer continues)
      await SLAService.stopTimer(ticketId, 'response');

      console.log(`First response recorded for ticket ${ticketId}, response timer stopped`);
    }

    return message;
  } catch (error) {
    console.error('Error handling first response:', error);
    throw error;
  }
}

/**
 * Example 5: Resolve ticket and calculate resolution time
 */
async function onTicketResolved(ticketId, resolutionNote) {
  try {
    const ticket = await prisma.conversation.findUnique({
      where: { id: ticketId },
      select: { createdAt: true, status: true },
    });

    // Calculate resolution time
    const resolutionTime = Math.floor(
      (new Date() - new Date(ticket.createdAt)) / 1000
    );

    // Update ticket
    await prisma.conversation.update({
      where: { id: ticketId },
      data: {
        status: 'resolved',
        resolutionTimeSeconds: resolutionTime,
      },
    });

    // Add resolution note
    if (resolutionNote) {
      await prisma.ticketNote.create({
        data: {
          conversationId: ticketId,
          content: resolutionNote,
          isPrivate: false,
        },
      });
    }

    // Stop all SLA timers
    await SLAService.stopTimer(ticketId);

    // Record activity
    await prisma.ticketActivity.create({
      data: {
        conversationId: ticketId,
        activityType: 'status_changed',
        oldValue: ticket.status,
        newValue: 'resolved',
        performedBy: 'agent',
      },
    });

    console.log(`Ticket ${ticketId} resolved, all SLA timers stopped`);
    return true;
  } catch (error) {
    console.error('Error resolving ticket:', error);
    throw error;
  }
}

/**
 * Example 6: Check SLA status before displaying ticket
 */
async function getTicketWithSLAStatus(ticketId) {
  try {
    // Get ticket details
    const ticket = await prisma.conversation.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        assignee: true,
        customer: true,
      },
    });

    // Get active SLA timers
    const timers = await prisma.sLATimer.findMany({
      where: {
        conversationId: ticketId,
        status: { in: ['running', 'paused'] },
      },
      include: {
        policy: {
          select: { name: true },
        },
      },
    });

    // Calculate current status for each timer
    const enrichedTimers = timers.map(timer => {
      const now = new Date();
      const startedAt = new Date(timer.startedAt);
      const elapsedMinutes = Math.floor((now - startedAt) / 60000) - timer.totalPausedTime;
      const remainingMinutes = timer.targetTime - elapsedMinutes;
      const percentageElapsed = (elapsedMinutes / timer.targetTime) * 100;

      let displayStatus = 'on_track';
      if (timer.status === 'paused') {
        displayStatus = 'paused';
      } else if (percentageElapsed >= 95) {
        displayStatus = 'critical';
      } else if (percentageElapsed >= 80) {
        displayStatus = 'at_risk';
      }

      return {
        ...timer,
        currentElapsedTime: elapsedMinutes,
        currentRemainingTime: remainingMinutes,
        percentageElapsed: percentageElapsed.toFixed(1),
        displayStatus,
      };
    });

    return {
      ...ticket,
      slaTimers: enrichedTimers,
    };
  } catch (error) {
    console.error('Error fetching ticket with SLA:', error);
    throw error;
  }
}

/**
 * Example 7: Get tickets breaching SLA soon (for dashboard alerts)
 */
async function getTicketsAtRisk(thresholdPercentage = 80) {
  try {
    const timers = await prisma.sLATimer.findMany({
      where: {
        status: 'running',
      },
      include: {
        policy: true,
      },
    });

    const atRiskTickets = [];

    for (const timer of timers) {
      const now = new Date();
      const startedAt = new Date(timer.startedAt);
      const elapsedMinutes = Math.floor((now - startedAt) / 60000) - timer.totalPausedTime;
      const percentageElapsed = (elapsedMinutes / timer.targetTime) * 100;

      if (percentageElapsed >= thresholdPercentage && percentageElapsed < 100) {
        const ticket = await prisma.conversation.findUnique({
          where: { id: timer.conversationId },
          include: {
            assignee: true,
            customer: true,
          },
        });

        atRiskTickets.push({
          ticket,
          timer: {
            ...timer,
            percentageElapsed: percentageElapsed.toFixed(1),
            remainingMinutes: timer.targetTime - elapsedMinutes,
          },
        });
      }
    }

    return atRiskTickets;
  } catch (error) {
    console.error('Error fetching at-risk tickets:', error);
    throw error;
  }
}

/**
 * Example 8: Setup automatic SLA monitoring (add to your server initialization)
 */
async function setupSLAMonitoring() {
  // Option 1: Using node-cron
  const cron = require('node-cron');
  
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('Running SLA monitor...');
    await SLAService.monitorTimers();
  });

  console.log('SLA monitoring service started');
}

// Export examples
export {
  onTicketCreated,
  onTicketStatusChanged,
  onTicketPriorityChanged,
  onAgentFirstResponse,
  onTicketResolved,
  getTicketWithSLAStatus,
  getTicketsAtRisk,
  setupSLAMonitoring,
};

