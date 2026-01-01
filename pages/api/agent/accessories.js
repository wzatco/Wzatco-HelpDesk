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
      const { includeInactive = 'false' } = req.query;
      
      const accessories = await prisma.accessory.findMany({
        where: includeInactive === 'true' ? {} : { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          specifications: true,
          productId: true,
          isActive: true
        }
      });
      
      return res.status(200).json({ accessories });
    } catch (error) {
      console.error('Error fetching accessories:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
