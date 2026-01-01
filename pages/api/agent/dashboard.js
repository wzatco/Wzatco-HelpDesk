import prisma from '../../../lib/prisma';
import { getCurrentAgentId } from '../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agentId = await getCurrentAgentId(req);

    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get ticket counts
    const [assignedTickets, openTickets, pendingTickets, resolvedToday] = await Promise.all([
      prisma.conversation.count({
        where: {
          assigneeId: agentId,
          status: { not: 'closed' }
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: agentId,
          status: 'open'
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: agentId,
          status: 'pending'
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: agentId,
          status: 'resolved',
          updatedAt: {
            gte: today
          }
        }
      })
    ]);

    // Get chart data for the past 7 days
    const chartData = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [resolved, opened] = await Promise.all([
        prisma.conversation.count({
          where: {
            assigneeId: agentId,
            status: 'resolved',
            updatedAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        }),
        prisma.conversation.count({
          where: {
            assigneeId: agentId,
            createdAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        })
      ]);

      chartData.push({
        day: days[(dayStart.getDay() + 6) % 7], // Convert Sunday=0 to Monday=0 indexing
        resolved,
        opened
      });
    }

    // Get urgent tickets (high/urgent priority)
    const urgentTickets = await prisma.conversation.findMany({
      where: {
        assigneeId: agentId,
        status: { in: ['open', 'pending'] },
        priority: { in: ['high', 'urgent'] }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 5,
      include: {
        customer: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Get recent activity (recent tickets with actions)
    const recentTickets = await prisma.conversation.findMany({
      where: {
        assigneeId: agentId
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10,
      include: {
        customer: {
          select: {
            name: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            senderType: true,
            createdAt: true
          }
        }
      }
    });

    // Format recent activity
    const recentActivity = recentTickets.slice(0, 4).map((ticket, index) => {
      const lastMessage = ticket.messages[0];
      const timeDiff = Date.now() - new Date(ticket.updatedAt).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const hoursAgo = Math.floor(minutesAgo / 60);

      let timeStr = minutesAgo < 1 ? 'just now' :
        minutesAgo < 60 ? `${minutesAgo}m ago` :
          `${hoursAgo}h ago`;

      let type = 'assigned';
      let message = `Ticket #${ticket.ticketNumber} assigned to you`;
      let urgent = false;

      if (ticket.status === 'resolved') {
        type = 'resolved';
        message = `You resolved Ticket #${ticket.ticketNumber}`;
      } else if (lastMessage && lastMessage.senderType === 'customer') {
        type = 'reply';
        message = `Customer replied to Ticket #${ticket.ticketNumber}`;
        urgent = true;
      } else if (ticket.status === 'open' && ticket.priority === 'high') {
        urgent = true;
        message = `Ticket #${ticket.ticketNumber} needs attention`;
      }

      return {
        id: ticket.id,
        type,
        message,
        time: timeStr,
        urgent
      };
    });

    // Calculate average response time (in minutes)
    // Get tickets with at least one agent/admin reply
    const ticketsWithReplies = await prisma.conversation.findMany({
      where: {
        assigneeId: agentId,
        messages: {
          some: {
            senderType: { in: ['agent', 'admin'] }
          }
        }
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            senderType: true,
            createdAt: true
          }
        }
      }
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    ticketsWithReplies.forEach(ticket => {
      const firstCustomerMsg = ticket.messages.find(m => m.senderType === 'customer');
      const firstAgentReply = ticket.messages.find(m => m.senderType === 'agent' || m.senderType === 'admin');

      if (firstCustomerMsg && firstAgentReply) {
        const responseTime = new Date(firstAgentReply.createdAt) - new Date(firstCustomerMsg.createdAt);
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 60000) : 0; // in minutes

    // Calculate average resolution time (in hours)
    const resolvedTickets = await prisma.conversation.findMany({
      where: {
        assigneeId: agentId,
        status: 'resolved'
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    let totalResolutionTime = 0;
    resolvedTickets.forEach(ticket => {
      const resolutionTime = new Date(ticket.updatedAt) - new Date(ticket.createdAt);
      totalResolutionTime += resolutionTime;
    });

    const avgResolutionTime = resolvedTickets.length > 0
      ? Math.round(totalResolutionTime / resolvedTickets.length / 3600000) // in hours
      : 0;

    return res.status(200).json({
      success: true,
      stats: {
        assignedTickets,
        openTickets,
        pendingTickets,
        resolvedToday,
        avgResponseTime,
        avgResolutionTime
      },
      chartData,
      urgentTickets: urgentTickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        customerName: ticket.customer?.name || 'Unknown',
        customerEmail: ticket.customer?.email || '',
        createdAt: ticket.createdAt,
        slaTimeLeft: calculateSLATimeLeft(ticket)
      })),
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to calculate SLA time left (in hours)
function calculateSLATimeLeft(ticket) {
  // Default SLA: 24 hours for high priority, 48 hours for others
  const slaHours = ticket.priority === 'high' || ticket.priority === 'urgent' ? 24 : 48;
  const createdAt = new Date(ticket.createdAt);
  const deadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
  const timeLeft = deadline - Date.now();
  const hoursLeft = Math.max(0, Math.round(timeLeft / 3600000));

  return {
    hours: hoursLeft,
    percentage: Math.max(0, Math.min(100, (hoursLeft / slaHours) * 100))
  };
}

