import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all tickets with issueType or category
    const tickets = await prisma.conversation.findMany({
      select: {
        issueType: true,
        category: true,
        status: true
      }
    });

    // Group by issueType (prefer issueType over category as it's more specific)
    const issueGroups = {};
    
    tickets.forEach(ticket => {
      // Use issueType if available, otherwise fall back to category
      const issueKey = ticket.issueType || ticket.category || 'Uncategorized';
      
      if (!issueGroups[issueKey]) {
        issueGroups[issueKey] = {
          name: issueKey,
          count: 0,
          openCount: 0
        };
      }
      
      issueGroups[issueKey].count++;
      if (ticket.status === 'open' || ticket.status === 'pending') {
        issueGroups[issueKey].openCount++;
      }
    });

    // Convert to array and sort by count (descending)
    const sortedIssues = Object.values(issueGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Take top 5

    // Calculate total for percentages
    const total = sortedIssues.reduce((sum, issue) => sum + issue.count, 0);

    // Add percentage to each issue
    const topIssues = sortedIssues.map((issue, index) => ({
      id: `issue-${index}`,
      name: issue.name,
      count: issue.count,
      openCount: issue.openCount,
      percentage: total > 0 ? Math.round((issue.count / total) * 100) : 0
    }));

    res.status(200).json({
      success: true,
      topIssues,
      total
    });

  } catch (error) {
    console.error('Error fetching top issues:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
}

