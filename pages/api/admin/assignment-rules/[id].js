import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const rule = await prisma.assignmentRule.findUnique({
        where: { id }
      });

      if (!rule) {
        return res.status(404).json({ message: 'Assignment rule not found' });
      }

      return res.status(200).json({ rule });
    } catch (error) {
      console.error('Error fetching assignment rule:', error);
      return res.status(500).json({ message: 'Error fetching assignment rule', error: error.message });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { name, ruleType, priority, enabled, config, description } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (ruleType !== undefined) {
        const validRuleTypes = ['round_robin', 'load_based', 'department_match', 'skill_match'];
        if (!validRuleTypes.includes(ruleType)) {
          return res.status(400).json({ message: 'Invalid ruleType' });
        }
        updateData.ruleType = ruleType;
      }
      if (priority !== undefined) updateData.priority = priority;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (config !== undefined) updateData.config = config ? JSON.stringify(config) : null;
      if (description !== undefined) updateData.description = description || null;

      const rule = await prisma.assignmentRule.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json({ rule });
    } catch (error) {
      console.error('Error updating assignment rule:', error);
      return res.status(500).json({ message: 'Error updating assignment rule', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.assignmentRule.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Assignment rule deleted successfully' });
    } catch (error) {
      console.error('Error deleting assignment rule:', error);
      return res.status(500).json({ message: 'Error deleting assignment rule', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

