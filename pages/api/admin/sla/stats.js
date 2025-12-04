import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { startDate, endDate } = req.query;

      // Build date filter
      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }

      // Get policy counts
      const policyStats = await prisma.sLAPolicy.aggregate({
        _count: true,
      });

      const activePolicies = await prisma.sLAPolicy.count({
        where: { isActive: true },
      });

      // Get workflow counts
      const workflowStats = await prisma.sLAWorkflow.groupBy({
        by: ['isDraft', 'isActive'],
        _count: true,
      });

      const draftWorkflows = workflowStats.find(s => s.isDraft)?._count || 0;
      const publishedWorkflows = workflowStats.find(s => !s.isDraft && s.isActive)?._count || 0;

      // Get timer stats
      const timerStats = await prisma.sLATimer.groupBy({
        by: ['status'],
        _count: true,
      });

      const runningTimers = timerStats.find(s => s.status === 'running')?._count || 0;
      const pausedTimers = timerStats.find(s => s.status === 'paused')?._count || 0;
      const breachedTimers = timerStats.find(s => s.status === 'breached')?._count || 0;

      // Calculate timers at risk (>80% elapsed)
      const allRunningTimers = await prisma.sLATimer.findMany({
        where: {
          status: 'running',
        },
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
      const totalTicketsWithSLA = await prisma.sLATimer.count({
        where: {
          status: {
            in: ['stopped', 'breached'],
          },
        },
      });

      const complianceRate = totalTicketsWithSLA > 0
        ? ((totalTicketsWithSLA - breachedTimers) / totalTicketsWithSLA) * 100
        : 0;

      // Get average response and resolution times
      const completedTimers = await prisma.sLATimer.findMany({
        where: {
          status: 'stopped',
          timerType: {
            in: ['response', 'resolution'],
          },
          completedAt: {
            not: null,
          },
        },
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
      const escalationStats = await prisma.sLAEscalation.groupBy({
        by: ['escalationLevel'],
        where: dateFilter.gte || dateFilter.lte ? { escalatedAt: dateFilter } : {},
        _count: true,
      });

      return res.status(200).json({
        success: true,
        stats: {
          policies: {
            total: policyStats._count,
            active: activePolicies,
          },
          workflows: {
            draft: draftWorkflows,
            published: publishedWorkflows,
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

