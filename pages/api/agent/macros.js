import prisma from '../../../lib/prisma';
import { getCurrentAgent } from '../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  // Verify agent authentication
  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { activeOnly = 'false' } = req.query;
      
      const macros = await prisma.macro.findMany({
        where: activeOnly === 'true' ? { isActive: true } : {},
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          content: true,
          shortcut: true,
          category: true,
          isActive: true
        }
      });
      
      return res.status(200).json({ macros });
    } catch (error) {
      console.error('Error fetching macros:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
