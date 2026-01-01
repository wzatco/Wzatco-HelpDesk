import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agentId = await getCurrentAgentId(req);
    
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get date range (default: last 7 days)
    const days = parseInt(req.query.days) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get ticket counts
    const [openTickets, onHoldTickets, closedTickets, totalTickets] = await Promise.all([
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
          status: { in: ['resolved', 'closed'] }
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: agentId
        }
      })
    ]);

    // Get tickets for time calculations
    const ticketsWithMessages = await prisma.conversation.findMany({
      where: {
        assigneeId: agentId,
        createdAt: { gte: startDate }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      }
    });

    // Calculate response times
    let totalResponseTime = 0;
    let responseCount = 0;
    let firstResponseTime = 0;
    let firstResponseCount = 0;

    ticketsWithMessages.forEach(ticket => {
      const messages = ticket.messages || [];
      if (messages.length >= 2) {
        const firstCustomerMsg = messages.find(m => m.senderType === 'customer');
        // Only count if THIS specific agent was the first to reply
        const firstAgentReply = messages.find(m => m.senderType === 'agent' && m.senderId === agentId);
        
        if (firstCustomerMsg && firstAgentReply) {
          const responseTime = new Date(firstAgentReply.createdAt) - new Date(firstCustomerMsg.createdAt);
          totalResponseTime += responseTime;
          responseCount++;
          
          if (!firstResponseCount) {
            firstResponseTime = responseTime;
            firstResponseCount = 1;
          }
        }
      }
    });

    const avgResponseTime = responseCount > 0 
      ? Math.round(totalResponseTime / responseCount / 60000) // in minutes
      : 0;
    const firstResponseTimeMinutes = firstResponseCount > 0 
      ? Math.round(firstResponseTime / 60000)
      : 0;

    // Calculate resolution times
    const resolvedTickets = await prisma.conversation.findMany({
      where: {
        assigneeId: agentId,
        status: { in: ['resolved', 'closed'] },
        updatedAt: { gte: startDate }
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

    // Get customer ratings (if feedback exists)
    const feedbacks = await prisma.feedback.findMany({
      where: {
        agentId: agentId,
        submittedAt: { gte: startDate }
      },
      select: {
        rating: true
      }
    });

    // Calculate rating statistics
    const ratings = feedbacks.map(f => f.rating);
    const totalFeedbacks = feedbacks.length;
    const averageRating = totalFeedbacks > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / totalFeedbacks) * 100) / 100
      : 0;
    
    const ratingDistribution = {
      5: ratings.filter(r => r === 5).length,
      4: ratings.filter(r => r === 4).length,
      3: ratings.filter(r => r === 3).length,
      2: ratings.filter(r => r === 2).length,
      1: ratings.filter(r => r === 1).length
    };

    // Get tickets volume over time (for chart) - count all tickets assigned to agent
    const volumeData = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await prisma.conversation.count({
        where: {
          assigneeId: agentId,
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      volumeData.push({
        date: dayStart.toISOString().split('T')[0],
        count: count || 0
      });
    }

    // Get recent tickets (last 10)
    const recentTickets = await prisma.conversation.findMany({
      where: {
        assigneeId: agentId
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    return res.status(200).json({
      success: true,
      stats: {
        openTickets,
        onHoldTickets,
        closedTickets,
        totalTickets,
        avgResponseTime: avgResponseTime / 60, // Convert to hours
        firstResponseTime: firstResponseTimeMinutes / 60, // Convert to hours
        avgResolutionTime,
        ratingData: {
          averageRating,
          totalFeedbacks,
          ratingDistribution
        },
        volumeData
      },
      tickets: recentTickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        customer: ticket.customer,
        customerName: ticket.customer?.name,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching agent profile stats:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch profile statistics' 
    });
  }
}

