import { SLAService } from '../../../../lib/sla-service';
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

// Prisma singleton pattern

/**
 * SLA Actions Endpoint
 * Handle SLA actions like start, pause, resume, stop timers
 */
export default async function handler(req, res) {
  await ensurePrismaConnected();
  try {
    if (req.method === 'POST') {
      const { action, conversationId, priority, departmentId, category, timerType, reason } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
      }

      switch (action) {
        case 'start':
          if (!priority) {
            return res.status(400).json({
              success: false,
              message: 'Priority is required to start SLA timers',
            });
          }

          const timers = await SLAService.startTimers(
            conversationId,
            priority,
            departmentId,
            category
          );

          return res.status(200).json({
            success: true,
            message: 'SLA timers started',
            timers,
          });

        case 'pause':
          await SLAService.pauseTimer(conversationId, reason || 'Manual pause');
          
          return res.status(200).json({
            success: true,
            message: 'SLA timers paused',
          });

        case 'resume':
          await SLAService.resumeTimer(conversationId);
          
          return res.status(200).json({
            success: true,
            message: 'SLA timers resumed',
          });

        case 'stop':
          await SLAService.stopTimer(conversationId, timerType);
          
          return res.status(200).json({
            success: true,
            message: 'SLA timers stopped',
          });

        case 'restart':
          // Stop existing timers and start new ones
          await SLAService.stopTimer(conversationId);
          
          if (!priority) {
            return res.status(400).json({
              success: false,
              message: 'Priority is required to restart SLA timers',
            });
          }

          const newTimers = await SLAService.startTimers(
            conversationId,
            priority,
            departmentId,
            category
          );

          return res.status(200).json({
            success: true,
            message: 'SLA timers restarted',
            timers: newTimers,
          });

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Valid actions: start, pause, resume, stop, restart',
          });
      }
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('SLA Actions API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

