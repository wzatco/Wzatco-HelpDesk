import prisma, { ensurePrismaConnected } from '@/lib/prisma';

// Prisma singleton pattern

/**
 * SLA Report API
 * Calculates first response time and resolution time metrics
 * Properly handles firstResponseAt timestamps
 */
export default async function handler(req, res) {
  await ensurePrismaConnected();
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, priority, department } = req.query;

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

    // Build additional filters
    const where = { ...dateFilter };
    if (priority && priority !== 'all') {
      where.priority = priority;
    }
    if (department && department !== 'all') {
      where.departmentId = department;
    }

    // Get all tickets matching criteria
    const tickets = await prisma.conversation.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true
          }
        },
        department: {
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
        },
        activities: {
          where: {
            activityType: 'status_changed',
            newValue: 'resolved'
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const now = new Date();

    // Calculate SLA metrics for each ticket
    const slaReports = tickets.map(ticket => {
      // First Response Time calculation
      let firstResponseTimeMinutes = null;
      let firstResponseStatus = 'pending';
      
      if (ticket.firstResponseAt && ticket.createdAt) {
        // Use existing firstResponseAt timestamp (correctly set by agent message API)
        const responseTimeMs = new Date(ticket.firstResponseAt) - new Date(ticket.createdAt);
        firstResponseTimeMinutes = Math.round(responseTimeMs / (1000 * 60));
        firstResponseStatus = 'responded';
      } else if (ticket.firstResponseTimeSeconds) {
        // Fallback to firstResponseTimeSeconds if available
        firstResponseTimeMinutes = Math.round(ticket.firstResponseTimeSeconds / 60);
        firstResponseStatus = 'responded';
      } else if (ticket.status === 'resolved' || ticket.status === 'closed') {
        // Ticket closed without response
        firstResponseStatus = 'no_response';
      }

      // Resolution Time calculation
      let resolutionTimeHours = null;
      let resolutionStatus = 'open';
      
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        const resolvedActivity = ticket.activities[0];
        if (resolvedActivity) {
          const resolutionTimeMs = new Date(resolvedActivity.createdAt) - new Date(ticket.createdAt);
          resolutionTimeHours = Math.round((resolutionTimeMs / (1000 * 60 * 60)) * 100) / 100;
          resolutionStatus = 'resolved';
        } else {
          // Use current status timestamp as fallback
          const resolutionTimeMs = new Date(ticket.updatedAt) - new Date(ticket.createdAt);
          resolutionTimeHours = Math.round((resolutionTimeMs / (1000 * 60 * 60)) * 100) / 100;
          resolutionStatus = 'resolved';
        }
      } else if (ticket.resolutionTimeSeconds) {
        // Use stored resolution time if available
        resolutionTimeHours = Math.round((ticket.resolutionTimeSeconds / 3600) * 100) / 100;
        resolutionStatus = 'resolved';
      } else {
        // For open tickets, calculate time elapsed since creation
        const elapsedMs = now - new Date(ticket.createdAt);
        resolutionTimeHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100;
        resolutionStatus = ticket.status;
      }

      // SLA breach detection (example thresholds - should come from SLAPolicy)
      const slaThresholds = {
        high: { responseMinutes: 60, resolutionHours: 4 },
        medium: { responseMinutes: 240, resolutionHours: 24 },
        low: { responseMinutes: 480, resolutionHours: 48 }
      };

      const threshold = slaThresholds[ticket.priority] || slaThresholds.low;
      const responseBreached = firstResponseTimeMinutes !== null && firstResponseTimeMinutes > threshold.responseMinutes;
      const resolutionBreached = resolutionTimeHours !== null && resolutionTimeHours > threshold.resolutionHours;

      return {
        ticketId: ticket.ticketNumber,
        subject: ticket.subject || 'No Subject',
        status: ticket.status,
        priority: ticket.priority || 'low',
        customerName: ticket.customer?.name || ticket.customerName || 'Unknown',
        customerEmail: ticket.customer?.email || null,
        assigneeName: ticket.assignee?.name || 'Unassigned',
        departmentName: ticket.department?.name || 'No Department',
        createdAt: ticket.createdAt,
        firstResponseAt: ticket.firstResponseAt,
        firstResponseTimeMinutes,
        firstResponseStatus,
        responseBreached,
        resolutionTimeHours,
        resolutionStatus,
        resolutionBreached,
        slaThreshold: threshold
      };
    });

    // Calculate summary statistics
    const respondedTickets = slaReports.filter(t => t.firstResponseStatus === 'responded');
    const resolvedTickets = slaReports.filter(t => t.resolutionStatus === 'resolved');
    const responseBreaches = slaReports.filter(t => t.responseBreached);
    const resolutionBreaches = slaReports.filter(t => t.resolutionBreached);

    const avgFirstResponse = respondedTickets.length > 0
      ? Math.round(respondedTickets.reduce((sum, t) => sum + t.firstResponseTimeMinutes, 0) / respondedTickets.length)
      : null;

    const avgResolution = resolvedTickets.length > 0
      ? Math.round((resolvedTickets.reduce((sum, t) => sum + t.resolutionTimeHours, 0) / resolvedTickets.length) * 100) / 100
      : null;

    return res.status(200).json({
      success: true,
      data: slaReports,
      summary: {
        totalTickets: slaReports.length,
        respondedCount: respondedTickets.length,
        resolvedCount: resolvedTickets.length,
        responseBreachCount: responseBreaches.length,
        resolutionBreachCount: resolutionBreaches.length,
        responseBreachPercentage: slaReports.length > 0
          ? Math.round((responseBreaches.length / slaReports.length) * 100)
          : 0,
        resolutionBreachPercentage: slaReports.length > 0
          ? Math.round((resolutionBreaches.length / slaReports.length) * 100)
          : 0,
        avgFirstResponseMinutes: avgFirstResponse,
        avgResolutionHours: avgResolution
      }
    });
  } catch (error) {
    console.error('Error fetching SLA reports:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching SLA reports',
      error: error.message 
    });
  }
}
