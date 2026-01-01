/**
 * SLA Risk Monitoring Utility
 * Can be called periodically to check all tickets for SLA risk
 */

import prisma, { ensurePrismaConnected } from '../prisma';
import { notifySLARisk } from './notifications';

/**
 * Monitor all open tickets for SLA risk
 * Returns count of notifications sent
 */
export async function monitorSLARisks() {
  try {
    // Default SLA thresholds (in seconds)
    const DEFAULT_FIRST_RESPONSE_SLA = 4 * 60 * 60; // 4 hours
    const DEFAULT_RESOLUTION_SLA = {
      high: 24 * 60 * 60,    // 24 hours
      medium: 48 * 60 * 60,  // 48 hours
      low: 72 * 60 * 60      // 72 hours
    };

    // Risk thresholds (send alert when X% of SLA time remains)
    const FIRST_RESPONSE_RISK_THRESHOLD = 0.25; // Alert when 25% of time remains
    const RESOLUTION_RISK_THRESHOLD = 0.20;     // Alert when 20% of time remains

    // Get all open/pending tickets
    const openTickets = await prisma.conversation.findMany({
      where: {
        status: {
          in: ['open', 'pending']
        }
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            slaConfig: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    let notificationsSent = 0;
    const now = new Date();

    for (const ticket of openTickets) {
      // Parse department SLA config if available
      let firstResponseSLA = DEFAULT_FIRST_RESPONSE_SLA;
      let resolutionSLA = DEFAULT_RESOLUTION_SLA[ticket.priority || 'low'] || DEFAULT_RESOLUTION_SLA.low;

      if (ticket.department?.slaConfig) {
        try {
          const slaConfig = JSON.parse(ticket.department.slaConfig);
          if (slaConfig.firstResponseTime) {
            firstResponseSLA = slaConfig.firstResponseTime * 60 * 60; // Convert hours to seconds
          }
          if (slaConfig.resolutionTime) {
            const priorityConfig = slaConfig.resolutionTime[ticket.priority || 'low'];
            if (priorityConfig) {
              resolutionSLA = priorityConfig * 60 * 60; // Convert hours to seconds
            }
          }
        } catch (err) {
          console.error(`Error parsing SLA config for department ${ticket.department.id}:`, err);
        }
      }

      const ticketAge = Math.floor((now.getTime() - ticket.createdAt.getTime()) / 1000);

      // Check First Response SLA Risk
      if (!ticket.firstResponseAt && ticket.firstResponseTimeSeconds === null) {
        const timeRemaining = firstResponseSLA - ticketAge;
        const riskThreshold = firstResponseSLA * FIRST_RESPONSE_RISK_THRESHOLD;

        if (timeRemaining > 0 && timeRemaining <= riskThreshold) {
          // Check if we already sent a notification recently (within last hour)
          const recentNotification = await prisma.notification.findFirst({
            where: {
              type: 'sla_risk',
              metadata: {
                contains: `"ticketId":"${ticket.ticketNumber}"`
              },
              createdAt: {
                gte: new Date(now.getTime() - 60 * 60 * 1000) // Last hour
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          });

          if (!recentNotification) {
            // Send first response SLA risk notification
            const notification = await notifySLARisk(prisma, {
              ticketId: ticket.ticketNumber,
              ticketSubject: ticket.subject || 'No subject',
              slaType: 'first_response',
              timeRemaining,
              threshold: riskThreshold,
              userId: ticket.assigneeId || null, // Notify assigned agent, or all admins if unassigned
              sendEmail: true
            });

            if (notification) {
              notificationsSent++;
            }
          }
        }
      }

      // Check Resolution SLA Risk
      const timeRemaining = resolutionSLA - ticketAge;
      const riskThreshold = resolutionSLA * RESOLUTION_RISK_THRESHOLD;

      if (timeRemaining > 0 && timeRemaining <= riskThreshold) {
        // Check if we already sent a notification recently (within last hour)
        const recentNotification = await prisma.notification.findFirst({
          where: {
            type: 'sla_risk',
            metadata: {
              contains: `"ticketId":"${ticket.ticketNumber}"`
            },
            createdAt: {
              gte: new Date(now.getTime() - 60 * 60 * 1000) // Last hour
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (!recentNotification) {
          // Send resolution SLA risk notification
          const notification = await notifySLARisk(prisma, {
            ticketId: ticket.ticketNumber,
            ticketSubject: ticket.subject || 'No subject',
            slaType: 'resolution',
            timeRemaining,
            threshold: riskThreshold,
            userId: ticket.assigneeId || null, // Notify assigned agent, or all admins if unassigned
            sendEmail: true
          });

          if (notification) {
            notificationsSent++;
          }
        }
      }
    }

    return {
      success: true,
      notificationsSent,
      ticketsChecked: openTickets.length
    };
  } catch (error) {
    console.error('Error in SLA risk monitoring:', error);
    return {
      success: false,
      error: error.message,
      notificationsSent: 0,
      ticketsChecked: 0
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check SLA risk for a specific ticket
 * Called when ticket is updated or viewed
 */
export async function checkTicketSLARisk(ticketId) {
  try {
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber: ticketId },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            slaConfig: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!ticket || ticket.status === 'resolved' || ticket.status === 'closed') {
      return null;
    }

    // Default SLA thresholds
    const DEFAULT_FIRST_RESPONSE_SLA = 4 * 60 * 60; // 4 hours
    const DEFAULT_RESOLUTION_SLA = {
      high: 24 * 60 * 60,
      medium: 48 * 60 * 60,
      low: 72 * 60 * 60
    };

    const FIRST_RESPONSE_RISK_THRESHOLD = 0.25;
    const RESOLUTION_RISK_THRESHOLD = 0.20;

    let firstResponseSLA = DEFAULT_FIRST_RESPONSE_SLA;
    let resolutionSLA = DEFAULT_RESOLUTION_SLA[ticket.priority || 'low'] || DEFAULT_RESOLUTION_SLA.low;

    if (ticket.department?.slaConfig) {
      try {
        const slaConfig = JSON.parse(ticket.department.slaConfig);
        if (slaConfig.firstResponseTime) {
          firstResponseSLA = slaConfig.firstResponseTime * 60 * 60;
        }
        if (slaConfig.resolutionTime) {
          const priorityConfig = slaConfig.resolutionTime[ticket.priority || 'low'];
          if (priorityConfig) {
            resolutionSLA = priorityConfig * 60 * 60;
          }
        }
      } catch (err) {
        console.error(`Error parsing SLA config:`, err);
      }
    }

    const now = new Date();
    const ticketAge = Math.floor((now.getTime() - ticket.createdAt.getTime()) / 1000);
    const notifications = [];

    // Check First Response SLA Risk
    if (!ticket.firstResponseAt && ticket.firstResponseTimeSeconds === null) {
      const timeRemaining = firstResponseSLA - ticketAge;
      const riskThreshold = firstResponseSLA * FIRST_RESPONSE_RISK_THRESHOLD;

      if (timeRemaining > 0 && timeRemaining <= riskThreshold) {
        // Check for recent notification
        const recentNotification = await prisma.notification.findFirst({
          where: {
            type: 'sla_risk',
            metadata: {
              contains: `"ticketId":"${ticket.ticketNumber}"`
            },
            createdAt: {
              gte: new Date(now.getTime() - 60 * 60 * 1000)
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (!recentNotification) {
          const notification = await notifySLARisk(prisma, {
            ticketId: ticket.ticketNumber,
            ticketSubject: ticket.subject || 'No subject',
            slaType: 'first_response',
            timeRemaining,
            threshold: riskThreshold,
            userId: ticket.assigneeId || null,
            sendEmail: true
          });
          if (notification) notifications.push(notification);
        }
      }
    }

    // Check Resolution SLA Risk
    const timeRemaining = resolutionSLA - ticketAge;
    const riskThreshold = resolutionSLA * RESOLUTION_RISK_THRESHOLD;

    if (timeRemaining > 0 && timeRemaining <= riskThreshold) {
      // Check for recent notification
      const recentNotification = await prisma.notification.findFirst({
        where: {
          type: 'sla_risk',
          metadata: {
            contains: `"ticketId":"${ticket.ticketNumber}"`
          },
          createdAt: {
            gte: new Date(now.getTime() - 60 * 60 * 1000)
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!recentNotification) {
        const notification = await notifySLARisk(prisma, {
          ticketId: ticket.ticketNumber,
          ticketSubject: ticket.subject || 'No subject',
          slaType: 'resolution',
          timeRemaining,
          threshold: riskThreshold,
          userId: ticket.assigneeId || null,
          sendEmail: true
        });
        if (notification) notifications.push(notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error checking SLA risk:', error);
    return null;
  }
}

