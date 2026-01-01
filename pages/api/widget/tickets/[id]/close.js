import prisma from '../../../../lib/prisma';

/**
 * POST /api/widget/tickets/[id]/close
 * Allows customers to close their own tickets
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { customerId, customerEmail } = req.body;

  if (!customerId && !customerEmail) {
    return res.status(400).json({ error: 'Customer identification required' });
  }

  try {
    // Get ticket and verify ownership
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber: id },
      include: {
        customer: {
          select: { id: true, email: true }
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
      return res.status(403).json({ error: 'You can only close your own tickets' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Ticket is already closed' });
    }

    const oldStatus = ticket.status;

    // Auto-stop active worklogs when ticket is closed
    try {
      const activeWorklogs = await prisma.worklog.findMany({
        where: {
          ticketNumber: id,
          endedAt: null // Active sessions
        }
      });

      // Stop all active worklogs
      const stopReason = 'Ticket Closed';
      const endTime = new Date();

      for (const worklog of activeWorklogs) {
        const durationSeconds = Math.floor((endTime - new Date(worklog.startedAt)) / 1000);
        
        await prisma.worklog.update({
          where: { id: worklog.id },
          data: {
            endedAt: endTime,
            durationSeconds,
            stopReason,
            isSystemAuto: true
          }
        });
      }

      if (activeWorklogs.length > 0) {
        console.log(`Auto-stopped ${activeWorklogs.length} worklog(s) for ticket ${id} (closed by customer)`);
      }
    } catch (worklogError) {
      console.error('Error auto-stopping worklogs:', worklogError);
      // Don't fail the request if worklog stopping fails
    }

    // Update ticket status
    await prisma.conversation.update({
      where: { ticketNumber: id },
      data: { status: 'closed' }
    });

    // Log activity
    await prisma.ticketActivity.create({
      data: {
        conversationId: id,
        activityType: 'status_updated',
        oldValue: oldStatus,
        newValue: 'closed',
        performedBy: 'customer',
        performedByName: ticket.customer?.name || ticket.customerName || 'Customer'
      }
    });

    // Create system note
    await prisma.ticketNote.create({
      data: {
        conversationId: id,
        content: `Ticket closed by customer`,
        isPrivate: false,
        createdByName: 'System'
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Ticket closed successfully',
      status: 'closed' 
    });
  } catch (error) {
    console.error('Error closing ticket:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
