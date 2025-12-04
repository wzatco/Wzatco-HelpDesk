import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, type } = req.query;

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

    let csvContent = '';

    if (type === 'products') {
      // Fetch product data
      const tickets = await prisma.conversation.findMany({
        where: {
          ...dateFilter,
          productModel: { not: null }
        },
        include: {
          activities: {
            where: {
              activityType: 'status_changed',
              newValue: 'resolved'
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // Group by product
      const productStats = {};
      tickets.forEach(ticket => {
        const product = ticket.productModel;
        if (!productStats[product]) {
          productStats[product] = {
            productModel: product,
            totalTickets: 0,
            openTickets: 0,
            resolvedTickets: 0,
            totalResolutionTime: 0,
            resolvedCount: 0
          };
        }
        productStats[product].totalTickets++;
        if (ticket.status === 'open') productStats[product].openTickets++;
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          productStats[product].resolvedTickets++;
          const resolvedActivity = ticket.activities[0];
          if (resolvedActivity) {
            const resolutionTimeHours = (resolvedActivity.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            productStats[product].totalResolutionTime += resolutionTimeHours;
            productStats[product].resolvedCount++;
          }
        }
      });

      // Generate CSV
      csvContent = 'Product Model,Total Tickets,Open Tickets,Resolved Tickets,Average Resolution Time (Hours)\n';
      Object.values(productStats).forEach(product => {
        const avgResolution = product.resolvedCount > 0 
          ? (product.totalResolutionTime / product.resolvedCount).toFixed(2)
          : '0';
        csvContent += `"${product.productModel}",${product.totalTickets},${product.openTickets},${product.resolvedTickets},${avgResolution}\n`;
      });

    } else if (type === 'tat') {
      // Fetch TAT data
      const tickets = await prisma.conversation.findMany({
        where: dateFilter,
        include: {
          activities: {
            where: {
              activityType: 'status_changed',
              newValue: 'resolved'
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          assignee: { select: { name: true } },
          customer: { select: { name: true, email: true } }
        }
      });

      csvContent = 'Ticket ID,Subject,Status,Customer,Assignee,Product,Priority,Created At,Resolution Time (Hours),Exceeded\n';
      tickets.forEach(ticket => {
        let resolutionTime = '';
        let exceeded = 'No';
        
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const resolvedActivity = ticket.activities[0];
          if (resolvedActivity) {
            const hours = (resolvedActivity.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            resolutionTime = hours.toFixed(2);
            exceeded = hours > 24 ? 'Yes' : 'No';
          }
        }

        csvContent += `"${ticket.id}","${ticket.subject || 'No Subject'}","${ticket.status}","${ticket.customer?.name || ticket.customerName || 'Unknown'}","${ticket.assignee?.name || 'Unassigned'}","${ticket.productModel || 'N/A'}","${ticket.priority || 'low'}","${ticket.createdAt.toISOString()}",${resolutionTime},${exceeded}\n`;
      });

    } else if (type === 'agents') {
      // Fetch agent data
      const agents = await prisma.agent.findMany({
        where: { isActive: true },
        include: {
          assignedConversations: {
            where: dateFilter,
            include: {
              messages: { orderBy: { createdAt: 'asc' } },
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

      csvContent = 'Agent Name,Email,Department,Total Tickets,Open Tickets,Resolved Tickets,Average FRT (Hours),Average Resolution Time (Hours),Resolution Rate (%)\n';
      agents.forEach(agent => {
        const tickets = agent.assignedConversations;
        const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
        
        // Calculate FRT
        let totalFRT = 0;
        let frtCount = 0;
        tickets.forEach(ticket => {
          if (ticket.messages.length >= 2) {
            const agentMsg = ticket.messages.find(m => m.senderType === 'agent' || m.senderId === agent.id);
            if (agentMsg) {
              const frt = (agentMsg.createdAt.getTime() - ticket.messages[0].createdAt.getTime()) / (1000 * 60 * 60);
              totalFRT += frt;
              frtCount++;
            }
          }
        });
        const avgFRT = frtCount > 0 ? (totalFRT / frtCount).toFixed(2) : '0';

        // Calculate resolution time
        let totalResTime = 0;
        let resCount = 0;
        resolved.forEach(ticket => {
          const act = ticket.activities[0];
          if (act) {
            totalResTime += (act.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            resCount++;
          }
        });
        const avgResTime = resCount > 0 ? (totalResTime / resCount).toFixed(2) : '0';
        const resolutionRate = tickets.length > 0 ? ((resolved.length / tickets.length) * 100).toFixed(1) : '0';

        csvContent += `"${agent.name}","${agent.email || ''}","${agent.department || 'N/A'}",${tickets.length},${tickets.filter(t => t.status === 'open').length},${resolved.length},${avgFRT},${avgResTime},${resolutionRate}\n`;
      });

    } else {
      return res.status(400).json({ message: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${startDate}-${endDate}.csv"`);
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('Error exporting report:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error exporting report',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}


