import prisma from '../../../../lib/prisma';
import { getCurrentAgent } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  // Verify agent authentication
  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { conversationId } = req.query;
      
      if (!conversationId) {
        return res.status(400).json({ error: 'conversationId is required' });
      }

      const timers = await prisma.sLATimer.findMany({
        where: { conversationId },
        include: {
          policy: {
            select: {
              id: true,
              name: true,
              lowResponseTime: true,
              mediumResponseTime: true,
              highResponseTime: true,
              urgentResponseTime: true
            }
          }
        }
      });
      
      return res.status(200).json({ timers });
    } catch (error) {
      console.error('Error fetching SLA timers:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
