import prisma from '../../../lib/prisma';
import { getCurrentAgentId } from '../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agentId = await getCurrentAgentId(req);
    
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all active agents (excluding the current agent)
    const agents = await prisma.agent.findMany({
      where: {
        id: { not: agentId },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      agents: agents
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

