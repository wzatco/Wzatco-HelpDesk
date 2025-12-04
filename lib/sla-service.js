import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SLA Service - Background monitoring and management
 * This service handles:
 * - Starting SLA timers when tickets are created
 * - Monitoring active timers
 * - Sending escalation notifications
 * - Detecting and recording breaches
 * - Pausing/resuming timers based on conditions
 */

export class SLAService {
  /**
   * Start SLA timers for a ticket
   */
  static async startTimers(conversationId, priority, departmentId = null, category = null) {
    try {
      // Find applicable SLA policy
      const policy = await this.findApplicablePolicy(departmentId, category);
      
      if (!policy) {
        console.log('No applicable SLA policy found for ticket:', conversationId);
        return null;
      }

      // Get timer durations based on priority
      const responseTime = this.getResponseTime(policy, priority);
      const resolutionTime = this.getResolutionTime(policy, priority);

      if (!responseTime || !resolutionTime) {
        console.log('No SLA times configured for priority:', priority);
        return null;
      }

      // Create response timer
      const responseTimer = await prisma.sLATimer.create({
        data: {
          conversationId,
          policyId: policy.id,
          timerType: 'response',
          status: 'running',
          targetTime: responseTime,
          remainingTime: responseTime,
          initialPriority: priority,
        },
      });

      // Create resolution timer
      const resolutionTimer = await prisma.sLATimer.create({
        data: {
          conversationId,
          policyId: policy.id,
          timerType: 'resolution',
          status: 'running',
          targetTime: resolutionTime,
          remainingTime: resolutionTime,
          initialPriority: priority,
        },
      });

      console.log(`SLA timers started for ticket ${conversationId}`);
      return { responseTimer, resolutionTimer };
    } catch (error) {
      console.error('Error starting SLA timers:', error);
      return null;
    }
  }

  /**
   * Find applicable SLA policy based on filters
   */
  static async findApplicablePolicy(departmentId, category) {
    try {
      // Get all active policies
      const policies = await prisma.sLAPolicy.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          isDefault: 'desc', // Check default last
        },
      });

      // Find policy that matches filters
      for (const policy of policies) {
        // Parse filter arrays
        const policyDepartments = policy.departmentIds 
          ? JSON.parse(policy.departmentIds) 
          : null;
        const policyCategories = policy.categoryIds 
          ? JSON.parse(policy.categoryIds) 
          : null;

        // Check if policy applies
        const departmentMatch = !policyDepartments || 
          (departmentId && policyDepartments.includes(departmentId));
        const categoryMatch = !policyCategories || 
          (category && policyCategories.includes(category));

        if (departmentMatch && categoryMatch) {
          return policy;
        }
      }

      // Return default policy if no match
      return policies.find(p => p.isDefault) || null;
    } catch (error) {
      console.error('Error finding SLA policy:', error);
      return null;
    }
  }

  /**
   * Get response time for priority
   */
  static getResponseTime(policy, priority) {
    const priorityMap = {
      'low': policy.lowResponseTime,
      'medium': policy.mediumResponseTime,
      'high': policy.highResponseTime,
      'urgent': policy.urgentResponseTime,
    };
    return priorityMap[priority.toLowerCase()] || null;
  }

  /**
   * Get resolution time for priority
   */
  static getResolutionTime(policy, priority) {
    const priorityMap = {
      'low': policy.lowResolutionTime,
      'medium': policy.mediumResolutionTime,
      'high': policy.highResolutionTime,
      'urgent': policy.urgentResolutionTime,
    };
    return priorityMap[priority.toLowerCase()] || null;
  }

  /**
   * Monitor all active timers and send notifications
   */
  static async monitorTimers() {
    try {
      const activeTimers = await prisma.sLATimer.findMany({
        where: {
          status: 'running',
        },
        include: {
          policy: true,
        },
      });

      for (const timer of activeTimers) {
        await this.checkTimer(timer);
      }

      console.log(`Monitored ${activeTimers.length} active SLA timers`);
    } catch (error) {
      console.error('Error monitoring SLA timers:', error);
    }
  }

  /**
   * Check individual timer and handle escalations
   */
  static async checkTimer(timer) {
    try {
      const now = new Date();
      const startedAt = new Date(timer.startedAt);
      const elapsedMinutes = Math.floor((now - startedAt) / 60000) - timer.totalPausedTime;
      const percentageElapsed = (elapsedMinutes / timer.targetTime) * 100;

      // Check for breach
      if (percentageElapsed >= 100 && timer.status === 'running') {
        await this.handleBreach(timer, elapsedMinutes);
        return;
      }

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

      // Update remaining time
      await prisma.sLATimer.update({
        where: { id: timer.id },
        data: {
          elapsedTime: elapsedMinutes,
          remainingTime: timer.targetTime - elapsedMinutes,
        },
      });
    } catch (error) {
      console.error('Error checking SLA timer:', error);
    }
  }

  /**
   * Handle SLA breach
   */
  static async handleBreach(timer, actualTime) {
    try {
      // Get ticket details
      const ticket = await prisma.conversation.findUnique({
        where: { id: timer.conversationId },
        select: {
          priority: true,
          status: true,
          assigneeId: true,
          departmentId: true,
        },
      });

      // Mark timer as breached
      await prisma.sLATimer.update({
        where: { id: timer.id },
        data: {
          status: 'breached',
          breachedAt: new Date(),
        },
      });

      // Create breach record
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

      // Send breach notification
      await this.sendBreachNotification(timer, breach);

      // Create escalation event
      await prisma.sLAEscalation.create({
        data: {
          conversationId: timer.conversationId,
          timerId: timer.id,
          escalationLevel: 3,
          escalationType: 'sla_breach',
          reason: `SLA ${timer.timerType} time breached by ${actualTime - timer.targetTime} minutes`,
        },
      });

      console.log(`SLA breach recorded for ticket ${timer.conversationId}`);
    } catch (error) {
      console.error('Error handling SLA breach:', error);
    }
  }

  /**
   * Pause SLA timer
   */
  static async pauseTimer(conversationId, reason = 'Manual pause') {
    try {
      const timers = await prisma.sLATimer.findMany({
        where: {
          conversationId,
          status: 'running',
        },
      });

      for (const timer of timers) {
        await prisma.sLATimer.update({
          where: { id: timer.id },
          data: {
            status: 'paused',
            pausedAt: new Date(),
            pauseReason: reason,
          },
        });
      }

      console.log(`Paused ${timers.length} timers for ticket ${conversationId}`);
    } catch (error) {
      console.error('Error pausing SLA timer:', error);
    }
  }

  /**
   * Resume SLA timer
   */
  static async resumeTimer(conversationId) {
    try {
      const timers = await prisma.sLATimer.findMany({
        where: {
          conversationId,
          status: 'paused',
        },
      });

      for (const timer of timers) {
        const now = new Date();
        const pausedAt = new Date(timer.pausedAt);
        const pauseDuration = Math.floor((now - pausedAt) / 60000);

        await prisma.sLATimer.update({
          where: { id: timer.id },
          data: {
            status: 'running',
            resumedAt: now,
            totalPausedTime: timer.totalPausedTime + pauseDuration,
            pauseReason: null,
          },
        });
      }

      console.log(`Resumed ${timers.length} timers for ticket ${conversationId}`);
    } catch (error) {
      console.error('Error resuming SLA timer:', error);
    }
  }

  /**
   * Stop SLA timer (ticket resolved)
   */
  static async stopTimer(conversationId, timerType = null) {
    try {
      const where = {
        conversationId,
        status: { in: ['running', 'paused'] },
      };

      if (timerType) {
        where.timerType = timerType;
      }

      const timers = await prisma.sLATimer.findMany({ where });

      for (const timer of timers) {
        await prisma.sLATimer.update({
          where: { id: timer.id },
          data: {
            status: 'stopped',
            completedAt: new Date(),
          },
        });
      }

      console.log(`Stopped ${timers.length} timers for ticket ${conversationId}`);
    } catch (error) {
      console.error('Error stopping SLA timer:', error);
    }
  }

  /**
   * Send escalation notification
   */
  static async sendEscalationNotification(timer, level, percentage) {
    try {
      // Get ticket details
      const ticket = await prisma.conversation.findUnique({
        where: { id: timer.conversationId },
        select: {
          id: true,
          subject: true,
          assigneeId: true,
          priority: true,
        },
      });

      const levelText = level === 1 ? 'Warning' : 'Critical';
      const title = `SLA ${levelText}: ${timer.timerType} timer at ${percentage.toFixed(0)}%`;
      const message = `Ticket #${ticket?.id} is at ${percentage.toFixed(0)}% of its ${timer.timerType} time limit`;

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

      console.log(`Sent level ${level} escalation notification for ticket ${timer.conversationId}`);
    } catch (error) {
      console.error('Error sending escalation notification:', error);
    }
  }

  /**
   * Send breach notification
   */
  static async sendBreachNotification(timer, breach) {
    try {
      const ticket = await prisma.conversation.findUnique({
        where: { id: timer.conversationId },
        select: {
          id: true,
          subject: true,
          assigneeId: true,
          departmentId: true,
        },
      });

      const title = `SLA Breach: ${timer.timerType} time exceeded`;
      const message = `Ticket #${ticket?.id} has breached its ${timer.timerType} SLA by ${breach.breachTime} minutes`;

      // Notify assigned agent
      if (ticket?.assigneeId) {
        await prisma.notification.create({
          data: {
            userId: ticket.assigneeId,
            type: 'sla_breach',
            title,
            message,
            link: `/admin/tickets/${timer.conversationId}`,
            metadata: JSON.stringify({
              conversationId: timer.conversationId,
              breachId: breach.id,
            }),
          },
        });
      }

      // Notify admins/supervisors (get all admin users)
      const admins = await prisma.admin.findMany({
        where: {
          role: { in: ['Admin', 'Supervisor'] },
        },
        select: { id: true },
      });

      // Create notifications for admins
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'sla_breach',
            title,
            message,
            link: `/admin/tickets/${timer.conversationId}`,
            metadata: JSON.stringify({
              conversationId: timer.conversationId,
              breachId: breach.id,
            }),
          },
        });
      }

      console.log(`Sent breach notification for ticket ${timer.conversationId}`);
    } catch (error) {
      console.error('Error sending breach notification:', error);
    }
  }

  /**
   * Check if timer should be paused based on ticket status
   */
  static async checkPauseConditions(conversationId, status, policy) {
    try {
      const shouldPause = 
        (policy.pauseOnWaiting && status === 'waiting') ||
        (policy.pauseOnHold && status === 'on_hold');

      if (shouldPause) {
        await this.pauseTimer(conversationId, `Status changed to ${status}`);
      }
    } catch (error) {
      console.error('Error checking pause conditions:', error);
    }
  }
}

// Export singleton instance
export default SLAService;

