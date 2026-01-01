import prisma from '../../../../lib/prisma';
import { calculateAgentTAT } from '../../../../lib/utils/tat';

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
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

    // Get all tickets
    const tickets = await prisma.conversation.findMany({
      where: dateFilter,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1
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
    });

    // Pre-calculate active times for all resolved/closed tickets in parallel
    const resolvedClosedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    const activeTimeMap = new Map();
    
    await Promise.all(resolvedClosedTickets.map(async (ticket) => {
      try {
        const activeSeconds = await calculateAgentTAT(prisma, ticket.ticketNumber);
        activeTimeMap.set(ticket.ticketNumber, activeSeconds);
      } catch (error) {
        console.error(`Error calculating active time for ticket ${ticket.ticketNumber}:`, error);
        activeTimeMap.set(ticket.ticketNumber, 0);
      }
    }));

    // Group by issue (subject or first message content)
    const issueStats = {};

    tickets.forEach(ticket => {
      // Prefer issueType/category over subject for grouping
      let issue = ticket.issueType || ticket.category || 'Uncategorized';
      
      // If no issueType/category, fall back to subject or first message
      if (!ticket.issueType && !ticket.category) {
        issue = ticket.subject || 'No Subject';
        if (!issue || issue === 'No Subject') {
          const firstMessage = ticket.messages[0];
          if (firstMessage) {
            issue = firstMessage.content.substring(0, 100).trim();
            if (!issue) issue = 'No Description';
          } else {
            issue = 'No Description';
          }
        }
      }

      // Normalize issue (group similar issues)
      const normalizedIssue = issue.toLowerCase().substring(0, 80);

      if (!issueStats[normalizedIssue]) {
        issueStats[normalizedIssue] = {
          issue: issue,
          totalTickets: 0,
          openTickets: 0,
          pendingTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          totalResolutionTime: 0,
          resolvedCount: 0,
          totalActiveSeconds: 0, // Sum of active time from worklogs
          activeTicketCount: 0, // Count of tickets with >0 active time
          averageResolutionTime: 0,
          products: new Set()
        };
      }

      issueStats[normalizedIssue].totalTickets++;

      // Count by status
      if (ticket.status === 'open') issueStats[normalizedIssue].openTickets++;
      else if (ticket.status === 'pending') issueStats[normalizedIssue].pendingTickets++;
      else if (ticket.status === 'resolved') issueStats[normalizedIssue].resolvedTickets++;
      else if (ticket.status === 'closed') issueStats[normalizedIssue].closedTickets++;

      // Calculate resolution time (Calendar Time)
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        const resolvedActivity = ticket.activities[0];
        if (resolvedActivity) {
          const createdTime = ticket.createdAt.getTime();
          const resolvedTime = resolvedActivity.createdAt.getTime();
          const resolutionTimeHours = (resolvedTime - createdTime) / (1000 * 60 * 60);

          issueStats[normalizedIssue].totalResolutionTime += resolutionTimeHours;
          issueStats[normalizedIssue].resolvedCount++;
        }
        
        // Add active time (Actual Work Time)
        const activeSeconds = activeTimeMap.get(ticket.ticketNumber) || 0;
        if (activeSeconds > 0) {
          issueStats[normalizedIssue].totalActiveSeconds += activeSeconds;
          issueStats[normalizedIssue].activeTicketCount++;
        }
      }

      // Track products
      if (ticket.productModel) {
        issueStats[normalizedIssue].products.add(ticket.productModel);
      }
    });

    // Calculate average resolution time and convert Sets to Arrays
    Object.keys(issueStats).forEach(issue => {
      const stats = issueStats[issue];
      if (stats.resolvedCount > 0) {
        stats.averageResolutionTime = Math.round((stats.totalResolutionTime / stats.resolvedCount) * 100) / 100;
      }
      
      // Calculate active time metrics
      stats.totalActiveHours = Math.round((stats.totalActiveSeconds / 3600) * 100) / 100;
      stats.avgActiveHours = stats.resolvedCount > 0 
        ? Math.round((stats.totalActiveHours / stats.resolvedCount) * 100) / 100 
        : 0;
      
      stats.products = Array.from(stats.products);
    });

    // Convert to array and sort by total tickets
    const issues = Object.values(issueStats).sort((a, b) => b.totalTickets - a.totalTickets);

    return res.status(200).json({
      success: true,
      data: issues,
      summary: {
        totalIssues: issues.length,
        totalTickets: tickets.length
      }
    });
  } catch (error) {
    console.error('Error fetching issue analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching issue analytics',
      error: error.message
    });
  }
}


