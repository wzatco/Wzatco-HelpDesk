import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get current date for filtering
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch basic metrics
    const [
      totalTickets,
      openTickets,
      pendingTickets,
      resolvedToday,
      totalAgents,
      onlineAgents,
      recentMessages,
      recentlyCreatedConversations,
      recentlyResolvedConversations
    ] = await Promise.all([
      // Total tickets
      prisma.conversation.count(),
      
      // Open tickets
      prisma.conversation.count({
        where: { status: 'open' }
      }),
      
      // Pending tickets
      prisma.conversation.count({
        where: { status: 'pending' }
      }),
      
      // Resolved today
      prisma.conversation.count({
        where: {
          status: 'resolved',
          updatedAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Total agents
      prisma.agent.count(),
      
      // Active agents (agents with worklogs in last 24 hours)
      (async () => {
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const activeWorklogs = await prisma.worklog.findMany({
          where: {
            startedAt: { gte: last24Hours }
          },
          select: {
            agentId: true
          }
        });
        // Get unique agent IDs
        const uniqueAgentIds = new Set(activeWorklogs.map(w => w.agentId));
        return uniqueAgentIds.size;
      })(),

      // Recent messages - only get messages with valid conversations
      // First get all valid ticketNumbers, then query messages
      (async () => {
        try {
          // Get valid ticket numbers
          const validTicketNumbers = await prisma.conversation.findMany({
            select: { ticketNumber: true }
          }).then(convs => convs.map(c => c.ticketNumber));
          
          if (validTicketNumbers.length === 0) return [];
          
          // Query messages only for valid conversations
          const messages = await prisma.message.findMany({
            take: 15,
            orderBy: { createdAt: 'desc' },
            where: {
              conversationId: { in: validTicketNumbers }
            },
            include: {
              Conversation: {
                include: { customer: true, assignee: true }
              }
            }
          });
          return messages;
        } catch (error) {
          console.warn('Error fetching recent messages:', error.message);
          return [];
        }
      })(),

      // Recently created tickets
      prisma.conversation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, assignee: true }
      }),

      // Recently resolved tickets
      prisma.conversation.findMany({
        where: { status: 'resolved' },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: { customer: true, assignee: true }
      })
    ]);

    // Calculate average response time from real data (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get tickets with first customer message and first agent reply
    const ticketsWithResponses = await prisma.conversation.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        messages: {
          some: {
            senderType: 'agent'
          }
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10 // Get first few messages to find customer and agent messages
        }
      }
    });

    let totalAvgResponseTime = 0;
    let avgResponseCount = 0;
    
    ticketsWithResponses.forEach(ticket => {
      // Find first customer message
      const firstCustomerMessage = ticket.messages.find(m => m.senderType === 'customer');
      // Find first agent message
      const firstAgentMessage = ticket.messages.find(m => m.senderType === 'agent');
      
      if (firstCustomerMessage && firstAgentMessage && 
          firstAgentMessage.createdAt > firstCustomerMessage.createdAt) {
        const responseTime = firstAgentMessage.createdAt.getTime() - firstCustomerMessage.createdAt.getTime();
        totalAvgResponseTime += responseTime;
        avgResponseCount++;
      }
    });

    const avgResponseTime = avgResponseCount > 0 
      ? Math.round(totalAvgResponseTime / avgResponseCount / (1000 * 60)) // Convert to minutes
      : 0;

    // Calculate SLA compliance (for now, return 0 if no SLA system exists)
    // TODO: Implement real SLA compliance calculation based on SLA rules
    const slaCompliance = 0; // Placeholder - needs SLA system implementation

    // Calculate real KPIs based on database data
    const totalResolvedTickets = await prisma.conversation.count({
      where: { status: 'resolved' }
    });

    // First Response Time - calculate average time between ticket creation and first agent response (last 30 days)
    const conversationsWithFirstResponse = await prisma.conversation.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['open', 'pending', 'resolved', 'closed'] },
        messages: {
          some: {
            senderType: 'agent'
          }
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10 // Get first few messages to find first agent response
        }
      }
    });

    let totalResponseTime = 0;
    let responseCount = 0;
    
    conversationsWithFirstResponse.forEach(conv => {
      // Find first agent message
      const firstAgentMessage = conv.messages.find(m => m.senderType === 'agent');
      if (firstAgentMessage) {
        const responseTime = firstAgentMessage.createdAt.getTime() - conv.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const firstResponseTime = responseCount > 0 
      ? Math.round(totalResponseTime / responseCount / (1000 * 60)) // Convert to minutes
      : 0;

    // Resolution Rate - percentage of resolved tickets (last 30 days)
    const ticketsLast30Days = await prisma.conversation.count({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      }
    });
    
    const resolvedLast30Days = await prisma.conversation.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['resolved', 'closed'] }
      }
    });

    const resolutionRate = ticketsLast30Days > 0 
      ? Math.round((resolvedLast30Days / ticketsLast30Days) * 100) 
      : 0;

    // Customer Satisfaction - calculate from Feedback table (last 30 days)
    const feedbacksLast30Days = await prisma.feedback.findMany({
      where: {
        submittedAt: { gte: thirtyDaysAgo }
      },
      select: {
        rating: true
      }
    });

    let customerSatisfaction = 0;
    if (feedbacksLast30Days.length > 0) {
      const totalRating = feedbacksLast30Days.reduce((sum, f) => sum + f.rating, 0);
      const avgRating = totalRating / feedbacksLast30Days.length;
      // Convert 1-5 scale to percentage (1 = 0%, 5 = 100%)
      customerSatisfaction = Math.round(((avgRating - 1) / 4) * 100);
    }

    // Agent Productivity - tickets per agent per day
    const daysInMonth = 30;
    const agentProductivity = totalAgents > 0 ? Math.round(totalResolvedTickets / (totalAgents * daysInMonth)) : 0;

    // Get admin profile for avatar
    const adminProfile = await prisma.admin.findFirst({
      where: { email: 'admin@wzatco.com' }
    }).catch(() => null);
    const adminAvatarUrl = adminProfile?.avatarUrl || null;

    // Fetch ticket activities from TicketActivity model (with error handling)
    let ticketActivities = [];
    try {
      // First get all valid conversation IDs to filter activities
      const validConversationIds = await prisma.conversation.findMany({
        select: { ticketNumber: true }
      }).then(convs => convs.map(c => c.ticketNumber));

      if (validConversationIds.length > 0) {
        ticketActivities = await prisma.ticketActivity.findMany({
          where: {
            conversationId: {
              in: validConversationIds
            }
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            Conversation: {
              include: {
                customer: true,
                assignee: true
              }
            }
          }
        });
      }
    } catch (error) {
      // Model might not exist yet or Prisma client not regenerated
      // This is expected if the database hasn't been migrated or Prisma client regenerated
      console.log('TicketActivity model not available yet (this is normal on first run):', error.message);
      ticketActivities = [];
    }

    // Build activity feed from ticket activities
    const allActivities = ticketActivities
      .filter(activity => activity.Conversation) // Filter out activities with missing conversations
      .map(activity => {
        const conv = activity.Conversation;
        if (!conv || !conv.ticketNumber) return null; // Safety check
        
        let message = '';
        
        switch(activity.activityType) {
          case 'status_changed':
            message = `Ticket #${conv.ticketNumber} status changed to ${activity.newValue}`;
            break;
          case 'priority_changed':
            message = `Ticket #${conv.ticketNumber} priority changed to ${activity.newValue}`;
            break;
          case 'assigned':
            message = `Ticket #${conv.ticketNumber} assigned to ${activity.newValue || 'agent'}`;
            break;
          case 'unassigned':
            message = `Ticket #${conv.ticketNumber} unassigned`;
            break;
          case 'subject_updated':
            message = `Ticket #${conv.ticketNumber} subject updated`;
            break;
          case 'category_updated':
            message = `Ticket #${conv.ticketNumber} category changed to ${activity.newValue}`;
            break;
          case 'product_updated':
            message = `Ticket #${conv.ticketNumber} product model updated`;
            break;
          default:
            message = `Ticket #${conv.ticketNumber} updated`;
        }

        return {
          id: `act-${activity.id}`,
          type: activity.activityType,
          ticketId: conv.ticketNumber,
          customerName: conv.customer?.name || 'Customer',
          agentName: activity.performedBy === 'admin' ? 'Admin' : conv.assignee?.name,
          avatarUrl: activity.performedBy === 'admin' ? adminAvatarUrl : null,
          message,
          timestamp: activity.createdAt,
          priority: conv.priority || 'normal'
        };
      })
      .filter(activity => activity !== null)
      .slice(0, 10);

    // Add ticket creation activities (only if no activities exist or to show new tickets)
    const createdActivities = recentlyCreatedConversations
      .filter(conv => {
        // Only show if created in last 24 hours and no activity exists
        const hoursSinceCreation = (now - conv.createdAt) / (1000 * 60 * 60);
        return hoursSinceCreation < 24;
      })
      .map(conv => ({
        id: `new-${conv.ticketNumber}`,
        type: 'ticket_created',
        ticketId: conv.ticketNumber,
        customerName: conv.customer?.name || 'Customer',
        agentName: null,
        avatarUrl: null,
        message: `Ticket #${conv.ticketNumber} created`,
        timestamp: conv.createdAt,
        priority: conv.priority || 'normal'
      }));

    const finalActivities = [...allActivities, ...createdActivities]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    const metrics = {
      totalTickets,
      openTickets,
      pendingTickets,
      resolvedTickets: resolvedToday,
      onlineAgents,
      totalAgents,
      avgResponseTime,
      slaCompliance
    };

    const kpis = {
      firstResponseTime,
      resolutionRate,
      customerSatisfaction,
      agentProductivity
    };

    res.status(200).json({
      metrics,
      kpis,
      activity: finalActivities
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
