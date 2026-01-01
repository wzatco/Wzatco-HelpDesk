import prisma from '../../../../../lib/prisma';
import { getCurrentAgent } from '../../../../../lib/utils/agent-auth';

/**
 * POST /api/agent/tickets/[id]/reopen
 * Reopens a closed/resolved ticket with category and reason
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const { category, reason } = req.body;

  if (!category || !reason?.trim()) {
    return res.status(400).json({ error: 'Category and reason are required' });
  }

  const validCategories = [
    'Issue Recurred',
    'Not Fixed',
    'Additional Questions',
    'Follow-up Required',
    'Customer Request',
    'Other'
  ];

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    // Get current ticket
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber: id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldStatus = ticket.status;

    if (oldStatus !== 'closed' && oldStatus !== 'resolved') {
      return res.status(400).json({ error: 'Only closed or resolved tickets can be reopened' });
    }

    // Update ticket status to reopened
    await prisma.conversation.update({
      where: { ticketNumber: id },
      data: { 
        status: 'open',
        // Clear resolution time since ticket is being reopened
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
        performedBy: 'agent',
        performedByName: agent.name,
        reason: `Category: ${category}. ${reason.trim()}`
      }
    });

    // Create system note
    await prisma.ticketNote.create({
      data: {
        conversationId: id,
        content: `Ticket reopened from "${oldStatus}" status.\nCategory: ${category}\nReason: ${reason.trim()}`,
        isPrivate: false,
        createdById: agent.id,
        createdByName: agent.name
      }
    });

    // Emit Socket.IO events for real-time updates
    const io = req.io || global.io;
    if (io) {
      io.emit('ticket:updated', {
        ticketNumber: id,
        updates: { status: 'open' }
      });

      io.emit('ticket:status:changed', {
        ticketNumber: id,
        oldStatus: oldStatus,
        newStatus: 'open'
      });
    }

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
