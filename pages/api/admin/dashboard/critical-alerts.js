import prisma from '@/lib/prisma';

// Use singleton pattern for Prisma client
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get critical tickets (high/urgent priority, open status)
    const criticalTickets = await prisma.conversation.findMany({
      where: {
        status: { in: ['open', 'pending'] },
        priority: { in: ['high', 'urgent'] }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 10,
      include: {
        customer: {
          select: {
            name: true,
            email: true
          }
        },
        assignee: {
          select: {
            name: true
          }
        }
      }
    });

    // Calculate time since creation
    const now = new Date();
    const alerts = criticalTickets.map(ticket => {
      const createdTime = new Date(ticket.createdAt);
      const diffMs = now - createdTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeAgo;
      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24);
        timeAgo = `${days}d ago`;
      } else if (diffHours > 0) {
        timeAgo = `${diffHours}h ago`;
      } else {
        timeAgo = `${diffMinutes}m ago`;
      }

      return {
        id: ticket.ticketNumber,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject || 'No subject',
        priority: ticket.priority,
        status: ticket.status,
        customerName: ticket.customer?.name || ticket.customerName || 'Unknown',
        customerEmail: ticket.customer?.email || ticket.customerEmail || '',
        assigneeName: ticket.assignee?.name || 'Unassigned',
        issueType: ticket.issueType || ticket.category || 'General',
        createdAt: ticket.createdAt,
        timeAgo
      };
    });

    res.status(200).json({
      success: true,
      alerts,
      count: alerts.length
    });

  } catch (error) {
    console.error('Error fetching critical alerts:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
}

