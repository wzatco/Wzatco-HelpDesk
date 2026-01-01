import prisma from '../../../lib/prisma';
import { getCurrentAgentId } from '../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agentId = await getCurrentAgentId(req);

    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status } = req.body;

    if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: online, away, busy, or offline' });
    }

    // Update agent presence
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        presenceStatus: status,
        lastSeenAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      status,
      lastSeenAt: new Date()
    });
  } catch (error) {
    console.error('Error updating presence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

