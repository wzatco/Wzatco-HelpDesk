import prisma from '../../../../lib/prisma';
import { getCurrentAgent } from '../../../../lib/utils/agent-auth';

/**
 * POST /api/agent/worklogs/start
 * Start a new worklog session for a ticket
 * 
 * Body: { ticketNumber }
 * 
 * Rules:
 * - Check if an active session exists. If yes, return it. If no, create a NEW row.
 * - Never resume old rows.
 * - Reject if ticket is Closed/Resolved.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // Authenticate agent
    const agent = await getCurrentAgent(req);
    if (!agent) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    const { ticketNumber } = req.body;

    // Validate input
    if (!ticketNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'ticketNumber is required' 
      });
    }

    // Verify ticket exists and get its status
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber },
      select: { 
        ticketNumber: true, 
        status: true 
      }
    });

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        message: 'Ticket not found' 
      });
    }

    // Safety Check: Reject if ticket is Closed/Resolved
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot start worklog on ${ticket.status} ticket` 
      });
    }

    // Check for existing active worklog for this agent/ticket
    const existingActive = await prisma.worklog.findFirst({
      where: {
        ticketNumber,
        agentId: agent.id,
        endedAt: null // Active session
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    // If active session exists, return it (don't double start)
    if (existingActive) {
      return res.status(200).json({
        success: true,
        message: 'Active worklog session already exists',
        data: {
          id: existingActive.id,
          ticketNumber: existingActive.ticketNumber,
          agentId: existingActive.agentId,
          startedAt: existingActive.startedAt,
          endedAt: existingActive.endedAt,
          durationSeconds: existingActive.durationSeconds,
          stopReason: existingActive.stopReason,
          isSystemAuto: existingActive.isSystemAuto
        }
      });
    }

    // Create new worklog session
    const worklog = await prisma.worklog.create({
      data: {
        ticketNumber,
        agentId: agent.id,
        startedAt: new Date(),
        endedAt: null, // Active session
        durationSeconds: 0,
        stopReason: null,
        isSystemAuto: false
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Worklog session started',
      data: {
        id: worklog.id,
        ticketNumber: worklog.ticketNumber,
        agentId: worklog.agentId,
        startedAt: worklog.startedAt,
        endedAt: worklog.endedAt,
        durationSeconds: worklog.durationSeconds,
        stopReason: worklog.stopReason,
        isSystemAuto: worklog.isSystemAuto
      }
    });

  } catch (error) {
    console.error('Error starting worklog:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
}

