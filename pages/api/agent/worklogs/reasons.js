import prisma from '../../../../lib/prisma';
import { getCurrentAgent } from '../../../../lib/utils/agent-auth';

/**
 * GET /api/agent/worklogs/reasons
 * Fetch all active worklog reasons
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

    // Fetch all active worklog reasons
    const reasons = await prisma.worklogReason.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    return res.status(200).json({
      success: true,
      data: reasons
    });

  } catch (error) {
    console.error('Error fetching worklog reasons:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
}

