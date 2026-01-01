// Agent API - Fetch Assigned Callbacks
import prisma from '@/lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

// Prisma singleton pattern
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const agentId = await getCurrentAgentId(req);

    if (!agentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { status } = req.query;

    // Build where clause
    const where = {
      agentId: agentId
    };

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status;
    }

    // Fetch callbacks assigned to this agent
    const callbacks = await prisma.scheduledCallback.findMany({
      where,
      orderBy: {
        scheduledTime: 'asc'
      }
    });

    // Format callbacks for frontend
    const formattedCallbacks = callbacks.map(callback => ({
      id: callback.id,
      customerName: callback.customerName,
      customerEmail: callback.customerEmail,
      phoneNumber: callback.phoneNumber,
      countryCode: callback.countryCode,
      reason: callback.reason,
      scheduledTime: callback.scheduledTime,
      rescheduledTime: callback.rescheduledTime,
      status: callback.status,
      rescheduleStatus: callback.rescheduleStatus,
      denialReason: callback.denialReason,
      notes: callback.notes,
      createdAt: callback.createdAt,
      updatedAt: callback.updatedAt
    }));

    res.status(200).json({
      success: true,
      callbacks: formattedCallbacks,
      count: formattedCallbacks.length
    });

  } catch (error) {
    console.error('Error fetching agent callbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching callbacks',
      error: error.message
    });
  }
}

