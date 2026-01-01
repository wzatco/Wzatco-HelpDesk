import prisma from '../../../lib/prisma';
import { getCurrentAgentId } from '../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  const agentId = await getCurrentAgentId(req);

  if (!agentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { createdBy: agentId },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ filters });
    } catch (error) {
      console.error('Error fetching saved filters:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, filters } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Filter name is required' });
      }

      if (!filters || typeof filters !== 'object') {
        return res.status(400).json({ error: 'Filters object is required' });
      }

      // Check if agent already has a filter with this name
      const existing = await prisma.savedFilter.findFirst({
        where: {
          createdBy: agentId,
          name: name.trim()
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'A filter with this name already exists' });
      }

      const savedFilter = await prisma.savedFilter.create({
        data: {
          createdBy: agentId,
          name: name.trim(),
          filters: JSON.stringify(filters)
        }
      });

      res.status(201).json({ 
        success: true, 
        filter: {
          id: savedFilter.id,
          name: savedFilter.name,
          filters: JSON.parse(savedFilter.filters)
        }
      });
    } catch (error) {
      console.error('Error creating saved filter:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
