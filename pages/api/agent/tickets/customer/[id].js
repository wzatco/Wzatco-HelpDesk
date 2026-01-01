import prisma from '../../../../../lib/prisma';
import { getCurrentAgent } from '../../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  // Verify agent authentication
  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Fetch all tickets for this customer
      const tickets = await prisma.conversation.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          customerName: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      return res.status(200).json({ tickets });
    } catch (error) {
      console.error('Error fetching customer tickets:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
