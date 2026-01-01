import prisma from '../../../../lib/prisma';
import { getCurrentUserId, verifyToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUserId = getCurrentUserId(req);
    
    if (!adminUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Try to get adminId from token first
    const decoded = verifyToken(req);
    let adminId = null;
    
    if (decoded?.adminId) {
      // Use adminId directly from token
      adminId = decoded.adminId;
    } else {
      // Fallback: Look up Admin by User email
      const user = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { email: true }
      });
      
      if (user?.email) {
        const admin = await prisma.admin.findUnique({
          where: { email: user.email },
          select: { id: true }
        });
        if (admin) {
          adminId = admin.id;
        }
      }
    }

    if (!adminId) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Get date range (default: last 7 days)
    const days = parseInt(req.query.days) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // For admins, filter tickets where they have sent messages (tickets they've worked on)
    // First, get all ticket numbers where this admin has sent messages
    const adminMessages = await prisma.message.findMany({
      where: {
        senderType: 'admin',
        senderId: adminId,
        createdAt: { gte: startDate }
      },
      select: {
        conversationId: true
      },
      distinct: ['conversationId']
    });

    const adminTicketNumbers = adminMessages.map(m => m.conversationId);

    // If admin has no messages, return zero metrics
    if (adminTicketNumbers.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          openTickets: 0,
          onHoldTickets: 0,
          closedTickets: 0,
          totalTickets: 0,
          avgResponseTime: 0,
          firstResponseTime: 0,
          avgResolutionTime: 0,
          ratingData: {
            averageRating: 0,
            totalFeedbacks: 0,
            ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          },
          volumeData: []
        },
        tickets: []
      });
    }

    // Get tickets where admin has worked (sent messages)
    const [openTickets, onHoldTickets, closedTickets, totalTickets] = await Promise.all([
      prisma.conversation.count({
        where: {
          ticketNumber: { in: adminTicketNumbers },
          status: 'open',
          createdAt: { gte: startDate }
        }
      }),
      prisma.conversation.count({
        where: {
          ticketNumber: { in: adminTicketNumbers },
          status: 'pending',
          createdAt: { gte: startDate }
        }
      }),
      prisma.conversation.count({
        where: {
          ticketNumber: { in: adminTicketNumbers },
          status: { in: ['resolved', 'closed'] },
          updatedAt: { gte: startDate }
        }
      }),
      prisma.conversation.count({
        where: {
          ticketNumber: { in: adminTicketNumbers },
          createdAt: { gte: startDate }
        }
      })
    ]);

    // Get tickets for time calculations (only tickets admin has worked on)
    const ticketsWithMessages = await prisma.conversation.findMany({
      where: {
        ticketNumber: { in: adminTicketNumbers },
        createdAt: { gte: startDate }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      },
      take: 100 // Limit for performance
    });

    // Calculate response times (only count when admin replied)
    let totalResponseTime = 0;
    let responseCount = 0;
    let firstResponseTime = 0;
    let firstResponseCount = 0;

    ticketsWithMessages.forEach(ticket => {
      const messages = ticket.messages || [];
      if (messages.length >= 2) {
        const firstCustomerMsg = messages.find(m => m.senderType === 'customer');
        // Only count if admin was the first to reply (not agent)
        const firstAdminReply = messages.find(m => m.senderType === 'admin' && m.senderId === adminId);
        
        if (firstCustomerMsg && firstAdminReply) {
          const responseTime = new Date(firstAdminReply.createdAt) - new Date(firstCustomerMsg.createdAt);
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
      ? Math.round(totalResponseTime / responseCount / 60000) / 60 // in hours
      : 0;
    const firstResponseTimeHours = firstResponseCount > 0 
      ? Math.round(firstResponseTime / 60000) / 60
      : 0;

    // Calculate resolution times (only tickets admin has worked on)
    const resolvedTickets = await prisma.conversation.findMany({
      where: {
        ticketNumber: { in: adminTicketNumbers },
        status: { in: ['resolved', 'closed'] },
        updatedAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        updatedAt: true
      },
      take: 100
    });

    let totalResolutionTime = 0;
    resolvedTickets.forEach(ticket => {
      const resolutionTime = new Date(ticket.updatedAt) - new Date(ticket.createdAt);
      totalResolutionTime += resolutionTime;
    });

    const avgResolutionTime = resolvedTickets.length > 0
      ? Math.round(totalResolutionTime / resolvedTickets.length / 3600000) // in hours
      : 0;

    // Get customer ratings - Admins are not assigned to tickets, so they have no direct feedback
    // Feedback is only linked to Agents via agentId
    // For now, admins will see zero ratings since they can't receive feedback in the current system
    const feedbacks = [];

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

    // Get tickets volume over time (for chart) - only tickets admin has worked on
    const volumeData = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Count tickets where admin sent messages on this day
      const adminMessagesOnDay = await prisma.message.findMany({
        where: {
          senderType: 'admin',
          senderId: adminId,
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        },
        select: {
          conversationId: true
        },
        distinct: ['conversationId']
      });

      volumeData.push({
        date: dayStart.toISOString().split('T')[0],
        count: adminMessagesOnDay.length || 0
      });
    }

    // Get recent tickets (last 10) - only tickets admin has worked on
    const recentTickets = await prisma.conversation.findMany({
      where: {
        ticketNumber: { in: adminTicketNumbers }
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
        avgResponseTime,
        firstResponseTime: firstResponseTimeHours,
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
    console.error('Error fetching admin profile stats:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch profile statistics' 
    });
  }
}

