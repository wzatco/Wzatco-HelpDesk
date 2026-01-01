import prisma from '@/lib/prisma';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { startDate, endDate } = req.query;

      // Build date filter
      const dateFilter = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }

      // Get policy counts
      const policyStats = await prisma.sLAPolicy.aggregate({
        _count: true,
      });

      const activePolicies = await prisma.sLAPolicy.count({
        where: { isActive: true },
      });

      // Get timer stats (with date filter if provided)
      const timerStatsWhere = {};
      if (Object.keys(dateFilter).length > 0) {
        timerStatsWhere.createdAt = dateFilter;
      }
      const timerStats = await prisma.sLATimer.groupBy({
        by: ['status'],
        where: timerStatsWhere,
        _count: true,
      });

      const runningTimers = timerStats.find(s => s.status === 'running')?._count || 0;
      const pausedTimers = timerStats.find(s => s.status === 'paused')?._count || 0;
      const breachedTimers = timerStats.find(s => s.status === 'breached')?._count || 0;

      // Calculate timers at risk (>80% elapsed)
      const runningTimerWhere = {
        status: 'running',
      };
      if (Object.keys(dateFilter).length > 0) {
        runningTimerWhere.createdAt = dateFilter;
      }
      const allRunningTimers = await prisma.sLATimer.findMany({
        where: runningTimerWhere,
        select: {
          startedAt: true,
          targetTime: true,
          totalPausedTime: true,
        },
      });

      const atRiskTimers = allRunningTimers.filter(timer => {
        const now = new Date();
        const elapsedMinutes = Math.floor((now - new Date(timer.startedAt)) / 60000) - timer.totalPausedTime;
        const percentage = (elapsedMinutes / timer.targetTime) * 100;
        return percentage >= 80 && percentage < 100;
      }).length;

      // Get breach stats
      const breachWhere = {};
      if (Object.keys(dateFilter).length > 0) {
        breachWhere.breachedAt = dateFilter;
      }

      const totalBreaches = await prisma.sLABreach.count({
        where: breachWhere,
      });

      const breachesByType = await prisma.sLABreach.groupBy({
        by: ['breachType'],
        where: breachWhere,
        _count: true,
      });

      // Calculate compliance rate (tickets that met SLA vs breached)
      // Use date filter for timers if provided
      const timerWhere = {
        status: {
          in: ['stopped', 'breached'],
        },
      };
      if (Object.keys(dateFilter).length > 0) {
        timerWhere.createdAt = dateFilter;
      }
      const totalTicketsWithSLA = await prisma.sLATimer.count({
        where: timerWhere,
      });

      const complianceRate = totalTicketsWithSLA > 0
        ? ((totalTicketsWithSLA - breachedTimers) / totalTicketsWithSLA) * 100
        : 0;

      // Get average response and resolution times
      const completedTimerWhere = {
        status: 'stopped',
        timerType: {
          in: ['response', 'resolution'],
        },
        completedAt: {
          not: null,
        },
      };
      if (Object.keys(dateFilter).length > 0) {
        completedTimerWhere.completedAt = dateFilter;
      }
      const completedTimers = await prisma.sLATimer.findMany({
        where: completedTimerWhere,
        select: {
          timerType: true,
          startedAt: true,
          completedAt: true,
          totalPausedTime: true,
        },
      });

      const responseTimers = completedTimers.filter(t => t.timerType === 'response');
      const resolutionTimers = completedTimers.filter(t => t.timerType === 'resolution');

      const avgResponseTime = responseTimers.length > 0
        ? responseTimers.reduce((acc, timer) => {
            const elapsed = Math.floor((new Date(timer.completedAt) - new Date(timer.startedAt)) / 60000) - timer.totalPausedTime;
            return acc + elapsed;
          }, 0) / responseTimers.length
        : 0;

      const avgResolutionTime = resolutionTimers.length > 0
        ? resolutionTimers.reduce((acc, timer) => {
            const elapsed = Math.floor((new Date(timer.completedAt) - new Date(timer.startedAt)) / 60000) - timer.totalPausedTime;
            return acc + elapsed;
          }, 0) / resolutionTimers.length
        : 0;

      // Get escalation stats
      const escalationWhere = {};
      if (Object.keys(dateFilter).length > 0) {
        escalationWhere.escalatedAt = dateFilter;
      }
      const escalationStats = await prisma.sLAEscalation.groupBy({
        by: ['escalationLevel'],
        where: escalationWhere,
        _count: true,
      });

      return res.status(200).json({
        success: true,
        stats: {
          policies: {
            total: policyStats._count,
            active: activePolicies,
          },
          timers: {
            running: runningTimers,
            paused: pausedTimers,
            breached: breachedTimers,
            atRisk: atRiskTimers,
          },
          breaches: {
            total: totalBreaches,
            byType: breachesByType,
          },
          compliance: {
            rate: complianceRate.toFixed(2),
            totalTickets: totalTicketsWithSLA,
            metSLA: totalTicketsWithSLA - breachedTimers,
            breachedSLA: breachedTimers,
          },
          averageTimes: {
            response: {
              minutes: Math.round(avgResponseTime),
              formatted: formatMinutes(avgResponseTime),
            },
            resolution: {
              minutes: Math.round(avgResolutionTime),
              formatted: formatMinutes(avgResolutionTime),
            },
          },
          escalations: escalationStats,
        },
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('SLA Stats API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

