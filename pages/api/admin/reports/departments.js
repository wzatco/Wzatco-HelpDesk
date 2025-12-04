import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
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

    // Get all agents grouped by department
    const agents = await prisma.agent.findMany({
      where: {
        isActive: true,
        departmentId: { not: null }
      },
      include: {
        department: {
          select: { id: true, name: true }
        },
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

    // Group by department
    const departmentStats = {};
    
    agents.forEach(agent => {
      const dept = agent.department?.name || 'Unassigned';
      
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          totalAgents: 0,
          activeAgents: 0,
          totalTickets: 0,
          openTickets: 0,
          pendingTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          totalResolutionTime: 0,
          resolvedCount: 0,
          totalFRT: 0,
          frtCount: 0,
          averageResolutionTime: 0,
          averageFRT: 0,
          resolutionRate: 0
        };
      }

      departmentStats[dept].totalAgents++;
      if (agent.isActive) departmentStats[dept].activeAgents++;

      const tickets = agent.assignedConversations;
      departmentStats[dept].totalTickets += tickets.length;

      tickets.forEach(ticket => {
        // Count by status
        if (ticket.status === 'open') departmentStats[dept].openTickets++;
        else if (ticket.status === 'pending') departmentStats[dept].pendingTickets++;
        else if (ticket.status === 'resolved') departmentStats[dept].resolvedTickets++;
        else if (ticket.status === 'closed') departmentStats[dept].closedTickets++;

        // Calculate resolution time
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const resolvedActivity = ticket.activities[0];
          if (resolvedActivity) {
            const createdTime = ticket.createdAt.getTime();
            const resolvedTime = resolvedActivity.createdAt.getTime();
            const resolutionTimeHours = (resolvedTime - createdTime) / (1000 * 60 * 60);
            departmentStats[dept].totalResolutionTime += resolutionTimeHours;
            departmentStats[dept].resolvedCount++;
          }
        }

        // Calculate First Response Time
        if (ticket.messages.length >= 2) {
          const customerMessage = ticket.messages[0];
          const agentMessage = ticket.messages.find(m => 
            m.senderType === 'agent' || m.senderId === agent.id
          );
          
          if (customerMessage && agentMessage) {
            const frtMs = agentMessage.createdAt.getTime() - customerMessage.createdAt.getTime();
            const frtHours = frtMs / (1000 * 60 * 60);
            departmentStats[dept].totalFRT += frtHours;
            departmentStats[dept].frtCount++;
          }
        }
      });
    });

    // Calculate averages and rates
    Object.keys(departmentStats).forEach(dept => {
      const stats = departmentStats[dept];
      
      if (stats.resolvedCount > 0) {
        stats.averageResolutionTime = Math.round((stats.totalResolutionTime / stats.resolvedCount) * 100) / 100;
      }
      
      if (stats.frtCount > 0) {
        stats.averageFRT = Math.round((stats.totalFRT / stats.frtCount) * 100) / 100;
      }
      
      if (stats.totalTickets > 0) {
        stats.resolutionRate = Math.round(((stats.resolvedTickets + stats.closedTickets) / stats.totalTickets) * 100);
      }
    });

    // Convert to array and sort by total tickets
    const departments = Object.values(departmentStats).sort((a, b) => b.totalTickets - a.totalTickets);

    return res.status(200).json({
      success: true,
      data: departments,
      summary: {
        totalDepartments: departments.length,
        totalAgents: departments.reduce((sum, d) => sum + d.totalAgents, 0),
        totalTickets: departments.reduce((sum, d) => sum + d.totalTickets, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching department analytics:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching department analytics',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}


