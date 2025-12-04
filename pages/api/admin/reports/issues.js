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

    // Group by issue (subject or first message content)
    const issueStats = {};
    
    tickets.forEach(ticket => {
      // Extract issue from subject or first message
      let issue = ticket.subject || 'No Subject';
      if (!issue || issue === 'No Subject') {
        const firstMessage = ticket.messages[0];
        if (firstMessage) {
          issue = firstMessage.content.substring(0, 100).trim();
          if (!issue) issue = 'No Description';
        } else {
          issue = 'No Description';
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

      // Calculate resolution time
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        const resolvedActivity = ticket.activities[0];
        if (resolvedActivity) {
          const createdTime = ticket.createdAt.getTime();
          const resolvedTime = resolvedActivity.createdAt.getTime();
          const resolutionTimeHours = (resolvedTime - createdTime) / (1000 * 60 * 60);
          
          issueStats[normalizedIssue].totalResolutionTime += resolutionTimeHours;
          issueStats[normalizedIssue].resolvedCount++;
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
  } finally {
    await prisma.$disconnect();
  }
}


