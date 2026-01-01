import prisma from '../../../../lib/prisma';

/**
 * POST /api/widget/tickets/[id]/reopen
 * Allows customers to reopen their own tickets with category and reason
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { customerId, customerEmail, category, reason } = req.body;

  if (!customerId && !customerEmail) {
    return res.status(400).json({ error: 'Customer identification required' });
  }

  if (!category || !reason?.trim()) {
    return res.status(400).json({ error: 'Category and reason are required' });
  }

  const validCategories = [
    'Issue Not Resolved',
    'Problem Returned',
    'Need More Help',
    'Other'
  ];

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    // Get ticket and verify ownership
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber: id },
      include: {
        customer: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify customer owns this ticket
    const isOwner = (customerId && ticket.customerId === customerId) ||
                    (customerEmail && ticket.customer?.email === customerEmail) ||
                    (customerEmail && ticket.customerEmail === customerEmail);

    if (!isOwner) {
      return res.status(403).json({ error: 'You can only reopen your own tickets' });
    }

    const oldStatus = ticket.status;

    if (oldStatus !== 'closed' && oldStatus !== 'resolved') {
      return res.status(400).json({ error: 'Only closed or resolved tickets can be reopened' });
    }

    // Update ticket status
    await prisma.conversation.update({
      where: { ticketNumber: id },
      data: { 
        status: 'open',
        resolutionTimeSeconds: null
      }
    });

    // Log activity
    await prisma.ticketActivity.create({
      data: {
        conversationId: id,
        activityType: 'ticket_reopened',
        oldValue: oldStatus,
        newValue: 'open',
        performedBy: 'customer',
        performedByName: ticket.customer?.name || ticket.customerName || 'Customer',
        reason: `Category: ${category}. ${reason.trim()}`
      }
    });

    // Create system note
    await prisma.ticketNote.create({
      data: {
        conversationId: id,
        content: `Ticket reopened by customer.\nCategory: ${category}\nReason: ${reason.trim()}`,
        isPrivate: false,
        createdByName: 'System'
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Ticket reopened successfully',
      status: 'open' 
    });
  } catch (error) {
    console.error('Error reopening ticket:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
