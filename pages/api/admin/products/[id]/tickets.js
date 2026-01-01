import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Fetch tickets for this product
    const tickets = await prisma.conversation.findMany({
      where: {
        productId: id
      },
      select: {
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        customerName: true,
        customer: {
          select: {
            name: true,
            email: true
          }
        },
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
    });

    // Format tickets for frontend
    const formattedTickets = tickets.map(ticket => ({
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject || 'No subject',
      status: ticket.status,
      priority: ticket.priority || 'low',
      customerName: ticket.customerName || ticket.customer?.name || 'Unknown',
      customerEmail: ticket.customer?.email || null,
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
    }));

    res.status(200).json({
      success: true,
      product: {
        id: product.id,
        name: product.name
      },
      tickets: formattedTickets,
      total: formattedTickets.length
    });
  } catch (error) {
    console.error('Error fetching product tickets:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

