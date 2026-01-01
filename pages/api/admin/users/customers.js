// API endpoint for fetching customers who raised tickets
import { PrismaClient } from '@prisma/client';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

// Prisma singleton pattern
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  const userId = getCurrentUserId(req);

  if (req.method === 'GET') {
    try {
      // Check permission
      if (userId) {
        const hasAccess = await checkPermissionOrFail(userId, 'admin.users', res);
        if (!hasAccess) return;
      }

      // Fetch customers who have at least one ticket
      const customers = await prisma.customer.findMany({
        where: {
          conversations: {
            some: {}
          }
        },
        include: {
          _count: {
            select: {
              conversations: true
            }
          },
          conversations: {
            select: {
              ticketNumber: true,
              status: true,
              priority: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: {
              updatedAt: 'desc'
            },
            take: 1 // Get the most recent ticket for preview
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Format customers with ticket stats
      const formattedCustomers = customers.map(customer => {
        const openTickets = customer.conversations.filter(t => 
          ['open', 'pending', 'in_progress'].includes(t.status)
        ).length;
        const resolvedTickets = customer.conversations.filter(t => 
          t.status === 'resolved'
        ).length;
        const closedTickets = customer.conversations.filter(t => 
          t.status === 'closed'
        ).length;

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          company: customer.company,
          location: customer.location,
          totalTickets: customer._count.conversations,
          openTickets,
          resolvedTickets,
          closedTickets,
          lastTicketDate: customer.conversations[0]?.updatedAt || customer.updatedAt,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        };
      });

      return res.status(200).json({
        success: true,
        customers: formattedCustomers,
        total: formattedCustomers.length
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customers',
        error: error.message
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

