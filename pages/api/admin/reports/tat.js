import prisma from '@/lib/prisma';
import { calculateAgentTAT } from '../../../../lib/utils/tat';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, thresholdHours = 24 } = req.query;

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

    // Get all tickets
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
        assignee: {
          select: {
            id: true,
            name: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const now = new Date();
    const thresholdMs = parseFloat(thresholdHours) * 60 * 60 * 1000;

    // Calculate TAT for each ticket (with active time)
    // NOTE: Business hours calculation can be added by integrating with BusinessHours config
    // Current calculation uses absolute time (24/7)
    const tatReports = await Promise.all(tickets.map(async (ticket) => {
      let resolutionTimeHours = null;
      let status = 'open';
      let exceeded = false;

      // Calculate Calendar Resolution Time (Total duration ticket was open)
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        const resolvedActivity = ticket.activities[0];
        if (resolvedActivity) {
          // Calculate resolution time from ticket creation to resolution
          const createdTime = ticket.createdAt.getTime();
          const resolvedTime = resolvedActivity.createdAt.getTime();
          resolutionTimeHours = (resolvedTime - createdTime) / (1000 * 60 * 60);
          status = 'resolved';
          exceeded = resolutionTimeHours > parseFloat(thresholdHours);
        }
      } else {
        // For open/pending tickets, calculate time since creation
        const createdTime = ticket.createdAt.getTime();
        const currentTime = now.getTime();
        resolutionTimeHours = (currentTime - createdTime) / (1000 * 60 * 60);
        status = ticket.status;
        exceeded = resolutionTimeHours > parseFloat(thresholdHours);
      }

      // Calculate Active TAT (Total duration agent actually worked)
      let activeSeconds = 0;
      let activeTimeHours = null;
      try {
        activeSeconds = await calculateAgentTAT(prisma, ticket.ticketNumber);
        if (activeSeconds > 0) {
          activeTimeHours = Math.round((activeSeconds / 3600) * 100) / 100;
        }
      } catch (error) {
        console.error(`Error calculating active time for ticket ${ticket.ticketNumber}:`, error);
        // Keep activeSeconds as 0 if calculation fails
      }

      return {
        ticketId: ticket.ticketNumber,
        subject: ticket.subject || 'No Subject',
        status,
        customerName: ticket.customer?.name || ticket.customerName || 'Unknown',
        customerEmail: ticket.customer?.email || null,
        assigneeName: ticket.assignee?.name || 'Unassigned',
        productModel: ticket.productModel || 'N/A',
        priority: ticket.priority || 'low',
        createdAt: ticket.createdAt,
        resolutionTimeHours: resolutionTimeHours ? Math.round(resolutionTimeHours * 100) / 100 : null, // Calendar TAT
        activeSeconds, // Active TAT in seconds
        activeTimeHours, // Active TAT in hours (formatted for display)
        exceeded,
        thresholdHours: parseFloat(thresholdHours)
      };
    }));

    // Filter exceeded tickets
    const exceededTickets = tatReports.filter(t => t.exceeded);
    
    // Sort by resolution time (descending)
    tatReports.sort((a, b) => {
      const timeA = a.resolutionTimeHours || 0;
      const timeB = b.resolutionTimeHours || 0;
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: tatReports,
      exceeded: exceededTickets,
      summary: {
        totalTickets: tatReports.length,
        exceededCount: exceededTickets.length,
        exceededPercentage: tatReports.length > 0 
          ? Math.round((exceededTickets.length / tatReports.length) * 100) 
          : 0,
        thresholdHours: parseFloat(thresholdHours)
      }
    });
  } catch (error) {
    console.error('Error fetching TAT reports:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching TAT reports',
      error: error.message 
    });
  }
}


