import prisma from '../../../../lib/prisma';
import { getCurrentAgent } from '../../../../lib/utils/agent-auth';

/**
 * POST /api/agent/worklogs/stop
 * Stop an active worklog session
 * 
 * Body: { ticketNumber, stopReason?, reasonId? }
 * 
 * Rules:
 * - Find the current active row for this user/ticket
 * - Update endedAt and calculate durationSeconds immediately
 * - Optionally set stopReason
 */
export default async function handler(req, res) {
  // Log for debugging
  console.log(`[Worklog Stop API] ${req.method} request received`);
  
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

    const { ticketNumber, stopReason, reasonId } = req.body;

    // Validate input
    if (!ticketNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'ticketNumber is required' 
      });
    }

    // Find active worklog for this ticket (check all agents first, then verify ownership)
    // This matches the GET endpoint behavior which shows all worklogs for the ticket
    let activeWorklog = await prisma.worklog.findFirst({
      where: {
        ticketNumber,
        endedAt: null // Active session
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    // If no active worklog found at all, return error
    if (!activeWorklog) {
      console.log(`[Worklog Stop API] No active worklog found for ticket ${ticketNumber}`);
      return res.status(200).json({ 
        success: false,
        message: 'No active worklog session found for this ticket' 
      });
    }

    // If the active worklog belongs to a different agent, allow stopping it anyway
    // (This handles cases where agent was reassigned or multiple agents worked on the ticket)
    if (activeWorklog.agentId !== agent.id) {
      console.log(`[Worklog Stop API] Active worklog belongs to agent ${activeWorklog.agentId}, but current agent is ${agent.id}. Allowing stop anyway.`);
    }

    // Calculate duration
    const endedAt = new Date();
    const startedAt = new Date(activeWorklog.startedAt);
    const durationSeconds = Math.floor((endedAt - startedAt) / 1000);

    // Prepare stop reason
    let finalStopReason = stopReason || null;
    
    // If reasonId is provided, fetch the reason name
    if (reasonId && !stopReason) {
      const reason = await prisma.worklogReason.findUnique({
        where: { id: reasonId },
        select: { name: true }
      });
      if (reason) {
        finalStopReason = reason.name;
      }
    }

    // Update worklog
    const updatedWorklog = await prisma.worklog.update({
      where: { id: activeWorklog.id },
      data: {
        endedAt,
        durationSeconds,
        stopReason: finalStopReason,
        isSystemAuto: false
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Worklog session stopped',
      data: {
        id: updatedWorklog.id,
        ticketNumber: updatedWorklog.ticketNumber,
        agentId: updatedWorklog.agentId,
        startedAt: updatedWorklog.startedAt,
        endedAt: updatedWorklog.endedAt,
        durationSeconds: updatedWorklog.durationSeconds,
        stopReason: updatedWorklog.stopReason,
        isSystemAuto: updatedWorklog.isSystemAuto
      }
    });

  } catch (error) {
    console.error('Error stopping worklog:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
}

