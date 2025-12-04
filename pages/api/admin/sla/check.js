import { PrismaClient } from '@prisma/client';
import { notifySLARisk } from '@/lib/utils/notifications';

const prisma = new PrismaClient();

/**
 * Check SLA risk for a specific ticket
 * Called when ticket is updated or viewed
 */
export async function checkTicketSLARisk(ticketId) {
  try {
    const ticket = await prisma.conversation.findUnique({
      where: { id: ticketId },
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
              contains: `"ticketId":"${ticket.id}"`
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
            ticketId: ticket.id,
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
            contains: `"ticketId":"${ticket.id}"`
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
          ticketId: ticket.id,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { ticketId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ message: 'Ticket ID is required' });
  }

  try {
    const notifications = await checkTicketSLARisk(ticketId);
    res.status(200).json({
      success: true,
      notifications: notifications || []
    });
  } catch (error) {
    console.error('Error checking SLA risk:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

