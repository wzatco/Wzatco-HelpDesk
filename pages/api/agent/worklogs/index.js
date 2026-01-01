import prisma from '../../../../lib/prisma';
import { getCurrentAgent } from '../../../../lib/utils/agent-auth';

/**
 * GET /api/agent/worklogs?ticketNumber=TKT-XXXX
 * Fetch all worklogs for a ticket with cumulative time calculation
 * 
 * Query: { ticketNumber }
 * 
 * Returns:
 * - activeLog: The active session (endedAt is null)
 * - historyLogs: All completed sessions
 * - totalSeconds: Sum of (historyLogs.durationSeconds) + (If active: Now - active.startedAt)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const { ticketNumber } = req.query;

    // Validate input
    if (!ticketNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'ticketNumber is required' 
      });
    }

    // Verify ticket exists
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber },
      select: { ticketNumber: true }
    });

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        message: 'Ticket not found' 
      });
    }

    // Fetch ALL worklogs for this ticket (ordered by startedAt desc)
    const allWorklogs = await prisma.worklog.findMany({
      where: {
        ticketNumber
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    // Separate active and completed logs
    const activeLog = allWorklogs.find(log => log.endedAt === null) || null;
    const historyLogs = allWorklogs.filter(log => log.endedAt !== null);

    // Calculate Total Cumulative Time (Server Side)
    // 1. Sum all completed session durations
    const historyTotal = historyLogs.reduce((sum, log) => {
      return sum + (log.durationSeconds || 0);
    }, 0);

    // 2. Add current active session duration (if exists)
    let currentSession = 0;
    if (activeLog) {
      const now = new Date();
      const startedAt = new Date(activeLog.startedAt);
      currentSession = Math.floor((now - startedAt) / 1000);
    }

    // 3. Grand Total
    const grandTotal = historyTotal + currentSession;

    // Format response
    const formatWorklog = (log) => ({
      id: log.id,
      ticketNumber: log.ticketNumber,
      agentId: log.agentId,
      agentName: log.agent?.name || 'Unknown',
      startedAt: log.startedAt,
      endedAt: log.endedAt,
      durationSeconds: log.durationSeconds,
      stopReason: log.stopReason,
      isSystemAuto: log.isSystemAuto
    });

    // Disable caching to ensure fresh data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json({
      success: true,
      data: {
        activeLog: activeLog ? formatWorklog(activeLog) : null,
        historyLogs: historyLogs.map(formatWorklog),
        totalSeconds: grandTotal,
        completedSeconds: historyTotal,
        activeSeconds: currentSession,
        totalCount: allWorklogs.length,
        activeCount: activeLog ? 1 : 0,
        historyCount: historyLogs.length
      }
    });

  } catch (error) {
    console.error('Error fetching worklogs:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
}

