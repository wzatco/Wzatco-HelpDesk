import prisma, { ensurePrismaConnected } from './prisma';

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
   * Check if a date/time is within business hours
   * @param {Date} date - The date to check
   * @param {string} businessHoursJson - JSON string with schedule: { "monday": "09:00-18:00", ... }
   * @param {string} timezone - Timezone string (e.g., "America/New_York", "Asia/Kolkata")
   * @param {string} holidaysJson - Optional JSON array of holiday dates: ["2024-01-01", "2024-12-25"]
   * @returns {boolean} - True if within business hours, false otherwise
   */
  static isWithinBusinessHours(date, businessHoursJson, timezone = 'UTC', holidaysJson = null) {
    try {
      // If business hours not configured, assume 24/7
      if (!businessHoursJson || businessHoursJson.trim() === '') {
        return true;
      }

      // Parse business hours schedule
      const schedule = JSON.parse(businessHoursJson);
      if (!schedule || typeof schedule !== 'object') {
        return true; // Invalid config = assume always open
      }

      // Check if date is a holiday
      if (holidaysJson) {
        try {
          const holidays = JSON.parse(holidaysJson);
          if (Array.isArray(holidays)) {
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            if (holidays.includes(dateStr)) {
              return false; // Holiday = closed
            }
          }
        } catch (err) {
          console.error('Error parsing holidays JSON:', err);
        }
      }

      // Convert date to target timezone
      // Format: "Monday", "Tuesday", etc. (full day name)
      const dayName = date.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: timezone
      }).toLowerCase();

      // Get schedule for this day
      const daySchedule = schedule[dayName];
      if (!daySchedule || daySchedule === '' || daySchedule === 'closed') {
        return false; // No schedule or explicitly closed
      }

      // Parse time range (e.g., "09:00-18:00")
      const [startTime, endTime] = daySchedule.split('-').map(t => t.trim());
      if (!startTime || !endTime) {
        return false; // Invalid format
      }

      // Get current time in target timezone (HH:MM format)
      const currentTime = date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
      });

      // Compare times (HH:MM format allows string comparison)
      return currentTime >= startTime && currentTime <= endTime;
    } catch (error) {
      console.error('Error checking business hours:', error);
      // On error, assume open (safer than blocking SLA)
      return true;
    }
  }

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

      // Check if we should start paused (outside business hours)
      const now = new Date();
      let initialStatus = 'running';
      let pauseReason = null;

      if (policy.useBusinessHours && policy.pauseOffHours) {
        const isBusinessHours = this.isWithinBusinessHours(
          now,
          policy.businessHours,
          policy.timezone,
          policy.holidays
        );

        if (!isBusinessHours) {
          initialStatus = 'paused';
          pauseReason = 'Outside business hours';
          console.log(`Starting SLA timers in paused state (outside business hours) for ticket ${conversationId}`);
        }
      }

      // Create response timer
      const responseTimer = await prisma.sLATimer.create({
        data: {
          conversationId,
          policyId: policy.id,
          timerType: 'response',
          status: initialStatus,
          targetTime: responseTime,
          remainingTime: responseTime,
          initialPriority: priority,
          pausedAt: initialStatus === 'paused' ? now : null,
          pauseReason: pauseReason,
        },
      });

      // Create resolution timer
      const resolutionTimer = await prisma.sLATimer.create({
        data: {
          conversationId,
          policyId: policy.id,
          timerType: 'resolution',
          status: initialStatus,
          targetTime: resolutionTime,
          remainingTime: resolutionTime,
          initialPriority: priority,
          pausedAt: initialStatus === 'paused' ? now : null,
          pauseReason: pauseReason,
        },
      });

      console.log(`SLA timers started for ticket ${conversationId} (status: ${initialStatus})`);
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
   * 
   * This function:
   * 1. Checks business hours for all timers (running and paused)
   * 2. Auto-pauses running timers when outside business hours
   * 3. Auto-resumes paused timers when business hours start
   * 4. Calculates elapsed time and checks for escalations/breaches
   * 
   * IMPORTANT: Should be called frequently (every 5 minutes) to catch business hours transitions
   */
  static async monitorTimers() {
    try {
      // Get both running and paused timers (paused timers need business hours check)
      const timers = await prisma.sLATimer.findMany({
        where: {
          status: { in: ['running', 'paused'] },
        },
        include: {
          policy: true,
        },
      });

      for (const timer of timers) {
        // Check business hours for all timers (running and paused)
        if (timer.policy.useBusinessHours && timer.policy.pauseOffHours) {
          const now = new Date();
          const isBusinessHours = this.isWithinBusinessHours(
            now,
            timer.policy.businessHours,
            timer.policy.timezone,
            timer.policy.holidays
          );

          // Auto-pause if outside business hours
          if (!isBusinessHours && timer.status === 'running') {
            await prisma.sLATimer.update({
              where: { id: timer.id },
              data: {
                status: 'paused',
                pausedAt: now,
                pauseReason: 'Outside business hours',
              },
            });
            console.log(`Auto-paused timer ${timer.id} (outside business hours)`);
            continue; // Skip elapsed time calculation for paused timer
          }

          // Auto-resume if inside business hours and was paused for business hours
          if (isBusinessHours && timer.status === 'paused' && timer.pauseReason === 'Outside business hours') {
            const pausedAt = new Date(timer.pausedAt || now);
            const pauseDuration = Math.floor((now - pausedAt) / 60000);

            await prisma.sLATimer.update({
              where: { id: timer.id },
              data: {
                status: 'running',
                resumedAt: now,
                totalPausedTime: (timer.totalPausedTime || 0) + pauseDuration,
                pauseReason: null,
              },
            });
            console.log(`Auto-resumed timer ${timer.id} (business hours started)`);
            
            // Refetch timer to get updated data before checking
            const refreshedTimer = await prisma.sLATimer.findUnique({
              where: { id: timer.id },
              include: { policy: true },
            });
            
            if (refreshedTimer && refreshedTimer.status === 'running') {
              await this.checkTimer(refreshedTimer);
            }
            continue; // Skip the check below since we already checked
          }
        }

        // Only check elapsed time for running timers
        if (timer.status === 'running') {
          await this.checkTimer(timer);
        }
      }

      console.log(`Monitored ${timers.length} SLA timers (running and paused)`);
    } catch (error) {
      console.error('Error monitoring SLA timers:', error);
    }
  }

  /**
   * Check individual timer and handle escalations
   */
  static async checkTimer(timer) {
    try {
      // Business hours check is now handled in monitorTimers() before calling checkTimer()
      // This ensures timers are paused/resumed before elapsed time calculation

      const now = new Date();
      const startedAt = new Date(timer.startedAt);
      // Calculate elapsed time accounting for paused time
      let elapsedMinutes = Math.floor((now - startedAt) / 60000);
      if (timer.pausedAt && timer.status === 'paused') {
        // If currently paused, don't count time since pause
        const pausedAt = new Date(timer.pausedAt);
        elapsedMinutes -= Math.floor((now - pausedAt) / 60000);
      }
      elapsedMinutes -= timer.totalPausedTime || 0;
      elapsedMinutes = Math.max(0, elapsedMinutes); // Ensure non-negative
      
      const percentageElapsed = Math.min(100, (elapsedMinutes / timer.targetTime) * 100);

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
        where: { ticketNumber: timer.conversationId },
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
        where: { ticketNumber: timer.conversationId },
        select: {
          ticketNumber: true,
          subject: true,
          assigneeId: true,
          priority: true,
          departmentId: true,
        },
      });

      const levelText = level === 1 ? 'Warning' : 'Critical';
      const isUnassigned = !ticket?.assigneeId;
      const unassignedPrefix = isUnassigned ? '⚠️ Unassigned Ticket - ' : '';
      const title = `${unassignedPrefix}SLA ${levelText}: ${timer.timerType} timer at ${percentage.toFixed(0)}%`;
      const message = `Ticket ${ticket?.ticketNumber || timer.conversationId}${isUnassigned ? ' (UNASSIGNED)' : ''} is at ${percentage.toFixed(0)}% of its ${timer.timerType} time limit`;

      const recipients = [];

      // If ticket is assigned, notify the assigned agent
      if (ticket?.assigneeId) {
        recipients.push(ticket.assigneeId);
      } else {
        // FALLBACK: If unassigned, notify ALL Admins
        const admins = await prisma.admin.findMany({
          where: {
            role: { in: ['Admin', 'Super Admin', 'Supervisor'] },
          },
          select: { id: true },
        });
        recipients.push(...admins.map(a => a.id));
        
        console.log(`⚠️ Unassigned ticket ${timer.conversationId} - notifying ${admins.length} admins for SLA escalation`);
      }

      // Create notifications for all recipients
      for (const userId of recipients) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'sla_risk',
            title,
            message,
            link: `/admin/tickets/${timer.conversationId}`,
            metadata: JSON.stringify({
              conversationId: timer.conversationId,
              timerId: timer.id,
              escalationLevel: level,
              isUnassigned,
            }),
          },
        });
      }

      console.log(`Sent level ${level} escalation notification for ticket ${timer.conversationId} to ${recipients.length} recipient(s)`);
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
        where: { ticketNumber: timer.conversationId },
        select: {
          ticketNumber: true,
          subject: true,
          assigneeId: true,
          departmentId: true,
        },
      });

      const isUnassigned = !ticket?.assigneeId;
      const unassignedPrefix = isUnassigned ? '🚨 Unassigned Ticket - ' : '';
      const title = `${unassignedPrefix}SLA Breach: ${timer.timerType} time exceeded`;
      const message = `Ticket ${ticket?.ticketNumber || timer.conversationId}${isUnassigned ? ' (UNASSIGNED)' : ''} has breached its ${timer.timerType} SLA by ${breach.breachTime} minutes`;

      const recipients = [];

      // If ticket is assigned, notify the assigned agent
      if (ticket?.assigneeId) {
        recipients.push(ticket.assigneeId);
      }

      // Always notify admins/supervisors (especially critical for unassigned tickets)
      const admins = await prisma.admin.findMany({
        where: {
          role: { in: ['Admin', 'Super Admin', 'Supervisor'] },
        },
        select: { id: true },
      });

      // Add admins to recipients (avoid duplicates if agent is also an admin)
      for (const admin of admins) {
        if (!recipients.includes(admin.id)) {
          recipients.push(admin.id);
        }
      }

      // If unassigned, log a warning
      if (isUnassigned) {
        console.log(`🚨 Unassigned ticket ${timer.conversationId} breached - notifying ${admins.length} admins`);
      }

      // Create notifications for all recipients
      for (const userId of recipients) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'sla_breach',
            title,
            message,
            link: `/admin/tickets/${timer.conversationId}`,
            metadata: JSON.stringify({
              conversationId: timer.conversationId,
              breachId: breach.id,
              isUnassigned,
            }),
          },
        });
      }

      console.log(`Sent breach notification for ticket ${timer.conversationId} to ${recipients.length} recipient(s)`);
    } catch (error) {
      console.error('Error sending breach notification:', error);
    }
  }

  /**
   * Check if timer should be paused or resumed based on ticket status
   */
  static async checkPauseConditions(conversationId, status, policy) {
    try {
      // Get current timers
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

      // Pause if conditions are met and timer is running
      if (shouldPause) {
        const runningTimers = timers.filter(t => t.status === 'running');
        if (runningTimers.length > 0) {
          await this.pauseTimer(conversationId, `Status changed to ${status}`);
        }
      } 
      // Resume if conditions are not met and timer is paused
      else {
        const pausedTimers = timers.filter(t => t.status === 'paused');
        if (pausedTimers.length > 0) {
          await this.resumeTimer(conversationId);
        }
      }
    } catch (error) {
      console.error('Error checking pause conditions:', error);
    }
  }
}

// Export singleton instance
// Export as default for compatibility (class is already exported as named export above)
export default SLAService;

