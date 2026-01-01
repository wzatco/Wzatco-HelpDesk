import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    // Build date filter for callbacks (uses scheduledTime)
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.scheduledTime = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.scheduledTime.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.scheduledTime.lte = end;
      }
    }

    // Fetch callbacks with agent information
    const callbacks = await prisma.scheduledCallback.findMany({
      where: dateFilter,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        scheduledTime: 'desc'
      }
    });

    // Calculate summary statistics
    const totalCallbacks = callbacks.length;
    const statusCounts = {
      pending: callbacks.filter(c => c.status === 'pending').length,
      completed: callbacks.filter(c => c.status === 'completed').length,
      cancelled: callbacks.filter(c => c.status === 'cancelled').length,
      denied: callbacks.filter(c => c.status === 'denied').length,
      rescheduled: callbacks.filter(c => c.status === 'rescheduled').length
    };

    const agentStats = {};
    callbacks.forEach(callback => {
      const agentId = callback.agentId || 'unassigned';
      const agentName = callback.agent?.name || 'Unassigned';
      
      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          agentId,
          agentName,
          total: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          denied: 0,
          rescheduled: 0
        };
      }
      
      agentStats[agentId].total++;
      if (callback.status) {
        agentStats[agentId][callback.status] = (agentStats[agentId][callback.status] || 0) + 1;
      }
    });

    const agentStatsArray = Object.values(agentStats).sort((a, b) => b.total - a.total);

    // Format callbacks for frontend
    const formattedCallbacks = callbacks.map(callback => ({
      id: callback.id,
      customerName: callback.customerName,
      customerEmail: callback.customerEmail,
      phoneNumber: callback.phoneNumber,
      countryCode: callback.countryCode,
      scheduledTime: callback.scheduledTime,
      rescheduledTime: callback.rescheduledTime,
      status: callback.status,
      rescheduleStatus: callback.rescheduleStatus,
      denialReason: callback.denialReason,
      notes: callback.notes,
      agentId: callback.agentId,
      agentName: callback.agent?.name || 'Unassigned',
      agentEmail: callback.agent?.email || 'N/A',
      departmentName: callback.agent?.department?.name || 'N/A',
      createdAt: callback.createdAt,
      updatedAt: callback.updatedAt
    }));

    return res.status(200).json({
      success: true,
      data: formattedCallbacks,
      summary: {
        totalCallbacks,
        statusCounts,
        agentStats: agentStatsArray,
        completionRate: totalCallbacks > 0 
          ? Math.round((statusCounts.completed / totalCallbacks) * 100) 
          : 0,
        cancellationRate: totalCallbacks > 0 
          ? Math.round((statusCounts.cancelled / totalCallbacks) * 100) 
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching callback reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching callback reports',
      error: error.message
    });
  }
}

