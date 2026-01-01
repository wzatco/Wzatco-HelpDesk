import prisma from '../../../../../lib/prisma';

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
    try {
    if (req.method === 'GET') {
      // Get all active timers with filters
      const { status, conversationId, policyId } = req.query;

      const where = {};
      if (status) where.status = status;
      if (conversationId) where.conversationId = conversationId;
      if (policyId) where.policyId = policyId;

      const timers = await prisma.sLATimer.findMany({
        where,
        include: {
          policy: {
            select: {
              id: true,
              name: true,
            },
          },
          breaches: {
            orderBy: {
              breachedAt: 'desc',
            },
          },
        },
        orderBy: {
          remainingTime: 'asc', // Show urgent ones first
        },
      });

      // Calculate current remaining time and status for each timer
      const enrichedTimers = timers.map(timer => {
        const now = new Date();
        const startedAt = new Date(timer.startedAt);
        // Calculate elapsed time accounting for paused time
        let elapsedMinutes = Math.floor((now - startedAt) / 60000);
        if (timer.pausedAt) {
          // If currently paused, don't count time since pause
          const pausedAt = new Date(timer.pausedAt);
          elapsedMinutes -= Math.floor((now - pausedAt) / 60000);
        }
        elapsedMinutes -= timer.totalPausedTime;
        elapsedMinutes = Math.max(0, elapsedMinutes); // Ensure non-negative
        
        const remainingMinutes = Math.max(0, timer.targetTime - elapsedMinutes);
        const percentageElapsed = Math.min(100, (elapsedMinutes / timer.targetTime) * 100);

        let displayStatus = 'on_track';
        if (timer.status === 'breached') {
          displayStatus = 'breached';
        } else if (timer.status === 'paused') {
          displayStatus = 'paused';
        } else if (percentageElapsed >= 95) {
          displayStatus = 'critical';
        } else if (percentageElapsed >= 80) {
          displayStatus = 'at_risk';
        }

        return {
          ...timer,
          currentElapsedTime: elapsedMinutes,
          currentRemainingTime: remainingMinutes,
          percentageElapsed,
          displayStatus,
        };
      });

      return res.status(200).json({
        success: true,
        timers: enrichedTimers,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('SLA Timer API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

