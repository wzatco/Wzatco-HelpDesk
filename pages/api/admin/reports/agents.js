import prisma, { ensurePrismaConnected } from '@/lib/prisma';

// Prisma singleton pattern

export default async function handler(req, res) {
  await ensurePrismaConnected();
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate);
      }
    }

    // Get all agents
    const agents = await prisma.agent.findMany({
      where: {
        isActive: true
      },
      include: {
        assignedConversations: {
          where: dateFilter,
          include: {
            messages: {
              orderBy: { createdAt: 'asc' }
            },
            activities: {
              where: {
                activityType: 'status_changed',
                newValue: 'resolved'
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    // Calculate performance metrics for each agent
    const agentPerformance = await Promise.all(agents.map(async (agent) => {
      const tickets = agent.assignedConversations;
      const totalTickets = tickets.length;
      const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
      const openTickets = tickets.filter(t => t.status === 'open');
      const pendingTickets = tickets.filter(t => t.status === 'pending');

      // Calculate First Response Time (FRT)
      let totalFRT = 0;
      let frtCount = 0;
      
      tickets.forEach(ticket => {
        if (ticket.messages.length >= 2) {
          // First message is usually from customer, second from agent
          const customerMessage = ticket.messages[0];
          const agentMessage = ticket.messages.find(m => 
            m.senderType === 'agent' || m.senderId === agent.id
          );
          
          if (customerMessage && agentMessage) {
            const frtMs = agentMessage.createdAt.getTime() - customerMessage.createdAt.getTime();
            const frtHours = frtMs / (1000 * 60 * 60);
            totalFRT += frtHours;
            frtCount++;
          }
        }
      });

      const averageFRT = frtCount > 0 ? Math.round((totalFRT / frtCount) * 100) / 100 : 0;

      // Calculate Average Resolution Time (Calendar Time)
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      resolvedTickets.forEach(ticket => {
        const resolvedActivity = ticket.activities[0];
        if (resolvedActivity) {
          const createdTime = ticket.createdAt.getTime();
          const resolvedTime = resolvedActivity.createdAt.getTime();
          const resolutionTimeHours = (resolvedTime - createdTime) / (1000 * 60 * 60);
          totalResolutionTime += resolutionTimeHours;
          resolvedCount++;
        }
      });

      const averageResolutionTime = resolvedCount > 0 
        ? Math.round((totalResolutionTime / resolvedCount) * 100) / 100 
        : 0;

      // Calculate Active Handling Time using Worklog Aggregation
      // Build worklog date filter matching the report's time range
      const worklogDateFilter = {};
      if (startDate || endDate) {
        worklogDateFilter.startedAt = {};
        if (startDate) {
          worklogDateFilter.startedAt.gte = new Date(startDate);
        }
        if (endDate) {
          worklogDateFilter.startedAt.lte = new Date(endDate);
        }
      }

      // Aggregate worklogs for this agent in the date range
      const worklogAggregate = await prisma.worklog.aggregate({
        where: {
          agentId: agent.id,
          ...worklogDateFilter
        },
        _sum: {
          durationSeconds: true
        },
        _count: {
          id: true
        }
      });

      // Calculate active time metrics from worklog aggregate
      const totalActiveSeconds = worklogAggregate._sum.durationSeconds || 0;
      const totalActiveHours = totalActiveSeconds / 3600;
      const worklogCount = worklogAggregate._count.id || 0;
      
      // Average active time per resolved ticket (if any resolved tickets)
      const averageActiveHours = resolvedCount > 0 
        ? Math.round((totalActiveHours / resolvedCount) * 100) / 100 
        : 0;
      const averageActiveMinutes = resolvedCount > 0
        ? Math.round((totalActiveSeconds / resolvedCount) / 60)
        : 0;

      // Calculate Resolution Rate
      const resolutionRate = totalTickets > 0 
        ? Math.round((resolvedTickets.length / totalTickets) * 100) 
        : 0;

      return {
        agentId: agent.id,
        agentName: agent.name,
        email: agent.email,
        department: agent.department || 'N/A',
        totalTickets,
        openTickets: openTickets.length,
        pendingTickets: pendingTickets.length,
        resolvedTickets: resolvedTickets.length,
        averageFRT,
        averageResolutionTime, // Calendar Resolution Time (Resolved - Created)
        totalActiveSeconds, // Total active seconds from worklogs
        totalActiveHours, // Total active hours from worklogs
        averageActiveHours, // Average Active Handling Time per resolved ticket (Sum of Worklogs / Resolved Count)
        averageActiveMinutes, // Average Active Handling Time in minutes (for display)
        worklogCount, // Number of worklog sessions
        resolutionRate
      };
    }));

    // Sort by total tickets (descending)
    agentPerformance.sort((a, b) => b.totalTickets - a.totalTickets);

    return res.status(200).json({
      success: true,
      data: agentPerformance,
      summary: {
        totalAgents: agentPerformance.length,
        totalTickets: agentPerformance.reduce((sum, a) => sum + a.totalTickets, 0),
        totalResolved: agentPerformance.reduce((sum, a) => sum + a.resolvedTickets, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching agent performance',
      error: error.message 
    });
  }
}


