import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  const { id } = req.query;
  const agentId = await getCurrentAgentId(req);

  if (!agentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'DELETE') {
    try {
      // Verify filter exists and belongs to this agent
      const filter = await prisma.savedFilter.findUnique({
        where: { id }
      });

      if (!filter) {
        return res.status(404).json({ error: 'Filter not found' });
      }

      if (filter.agentId !== agentId) {
        return res.status(403).json({ error: 'You can only delete your own filters' });
      }

      await prisma.savedFilter.delete({
        where: { id }
      });

      res.status(200).json({ 
        success: true,
        message: 'Filter deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting saved filter:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
