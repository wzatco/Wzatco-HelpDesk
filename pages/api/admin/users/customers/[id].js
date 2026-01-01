// API endpoint for fetching a single customer with their tickets
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

export default async function handler(req, res) {
  const { id } = req.query;
  const userId = getCurrentUserId(req);

  if (req.method === 'GET') {
    try {
      // Check permission
      if (userId) {
        const hasAccess = await checkPermissionOrFail(userId, 'admin.users', res);
        if (!hasAccess) return;
      }

      // Fetch customer
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          conversations: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              department: {
                select: {
                  id: true,
                  name: true
                }
              },
              _count: {
                select: {
                  messages: true
                }
              }
            },
            orderBy: {
              updatedAt: 'desc'
            }
          },
          _count: {
            select: {
              conversations: true
            }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Format customer data
      const formattedCustomer = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        location: customer.location,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        totalTickets: customer._count.conversations,
        tickets: customer.conversations.map(ticket => ({
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          assignee: ticket.assignee ? {
            id: ticket.assignee.id,
            name: ticket.assignee.name,
            email: ticket.assignee.email
          } : null,
          department: ticket.department ? {
            id: ticket.department.id,
            name: ticket.department.name
          } : null,
          messageCount: ticket._count.messages,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt
        }))
      };

      return res.status(200).json({
        success: true,
        customer: formattedCustomer
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customer',
        error: error.message
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

