import prisma from '../../../../lib/prisma';
import { getCurrentUserId } from '../../../../lib/auth';
import { checkPermissionOrFail } from '../../../../lib/permissions';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check admin permissions
    await checkPermissionOrFail(userId, 'agents', 'view');

    // Get active leaves (agents currently on leave)
    const activeLeaves = await prisma.agent.findMany({
      where: {
        status: 'ON_LEAVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        leaveFrom: true,
        leaveTo: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        leaveFrom: 'asc',
      },
    });

    // Get leave history (all LeaveHistory records)
    const history = await prisma.leaveHistory.findMany({
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    // Transform history to include calculated duration
    const historyWithDuration = history.map((leave) => {
      const start = new Date(leave.startDate);
      const end = leave.endDate ? new Date(leave.endDate) : new Date();
      const durationMs = end.getTime() - start.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      return {
        id: leave.id,
        agentId: leave.agentId,
        agentName: leave.agent.name,
        agentEmail: leave.agent.email,
        department: leave.agent.department,
        startDate: leave.startDate,
        endDate: leave.endDate,
        status: leave.status,
        durationDays: durationDays,
        createdAt: leave.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      activeLeaves: activeLeaves.map((agent) => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        leaveFrom: agent.leaveFrom,
        leaveTo: agent.leaveTo,
        expectedReturn: agent.leaveTo || 'Indefinite',
        department: agent.department,
      })),
      history: historyWithDuration,
    });
  } catch (error) {
    console.error('Error fetching leave data:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

