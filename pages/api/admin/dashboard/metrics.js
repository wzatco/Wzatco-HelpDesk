import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      
      // Online agents (mock data for now - would need real-time status tracking)
      prisma.agent.count(), // For now, assume all agents are online

      // Recent messages
      prisma.message.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          Conversation: {
            include: { customer: true, assignee: true }
          }
        }
      }),

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

    // Calculate average response time (mock calculation)
    const avgResponseTime = Math.floor(Math.random() * 30) + 5; // 5-35 minutes

    // Calculate SLA compliance (mock calculation)
    const slaCompliance = Math.floor(Math.random() * 20) + 80; // 80-100%

    // Calculate real KPIs based on database data
    const totalResolvedTickets = await prisma.conversation.count({
      where: { status: 'resolved' }
    });

    // First Response Time - calculate average time between ticket creation and first agent response
    const conversationsWithFirstResponse = await prisma.conversation.findMany({
      where: {
        status: { in: ['open', 'pending', 'resolved'] },
        messages: {
          some: {
            senderType: 'agent'
          }
        }
      },
      include: {
        messages: {
          where: { senderType: 'agent' },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    });

    let totalResponseTime = 0;
    let responseCount = 0;
    
    conversationsWithFirstResponse.forEach(conv => {
      if (conv.messages.length > 0) {
        const responseTime = conv.messages[0].createdAt.getTime() - conv.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const firstResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / (1000 * 60)) : 15; // Convert to minutes

    // Resolution Rate - percentage of resolved tickets
    const resolutionRate = totalTickets > 0 ? Math.round((totalResolvedTickets / totalTickets) * 100) : 0;

    // Customer Satisfaction - mock for now (would need rating system)
    const customerSatisfaction = Math.floor(Math.random() * 15) + 85; // 85-100%

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
      ticketActivities = await prisma.ticketActivity.findMany({
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
        if (!conv || !conv.id) return null; // Safety check
        
        let message = '';
        
        switch(activity.activityType) {
          case 'status_changed':
            message = `Ticket #${conv.id.substring(0, 8)} status changed to ${activity.newValue}`;
            break;
          case 'priority_changed':
            message = `Ticket #${conv.id.substring(0, 8)} priority changed to ${activity.newValue}`;
            break;
          case 'assigned':
            message = `Ticket #${conv.id.substring(0, 8)} assigned to ${activity.newValue || 'agent'}`;
            break;
          case 'unassigned':
            message = `Ticket #${conv.id.substring(0, 8)} unassigned`;
            break;
          case 'subject_updated':
            message = `Ticket #${conv.id.substring(0, 8)} subject updated`;
            break;
          case 'category_updated':
            message = `Ticket #${conv.id.substring(0, 8)} category changed to ${activity.newValue}`;
            break;
          case 'product_updated':
            message = `Ticket #${conv.id.substring(0, 8)} product model updated`;
            break;
          default:
            message = `Ticket #${conv.id.substring(0, 8)} updated`;
        }

        return {
          id: `act-${activity.id}`,
          type: activity.activityType,
          ticketId: conv.id.substring(0, 8),
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
        id: `new-${conv.id}`,
        type: 'ticket_created',
        ticketId: conv.id.substring(0, 8),
        customerName: conv.customer?.name || 'Customer',
        agentName: null,
        avatarUrl: null,
        message: `Ticket #${conv.id.substring(0, 8)} created`,
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
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
