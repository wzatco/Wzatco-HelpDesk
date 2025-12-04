import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const rules = await prisma.assignmentRule.findMany({
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return res.status(200).json({ rules });
    } catch (error) {
      console.error('Error fetching assignment rules:', error);
      return res.status(500).json({ message: 'Error fetching assignment rules', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, ruleType, priority, enabled, config, description } = req.body;

      if (!name || !ruleType) {
        return res.status(400).json({ message: 'Name and ruleType are required' });
      }

      const validRuleTypes = ['round_robin', 'load_based', 'department_match', 'skill_match'];
      if (!validRuleTypes.includes(ruleType)) {
        return res.status(400).json({ message: 'Invalid ruleType' });
      }

      const rule = await prisma.assignmentRule.create({
        data: {
          name,
          ruleType,
          priority: priority ?? 0,
          enabled: enabled ?? true,
          config: config ? JSON.stringify(config) : null,
          description: description || null
        }
      });

      return res.status(201).json({ rule });
    } catch (error) {
      console.error('Error creating assignment rule:', error);
      return res.status(500).json({ message: 'Error creating assignment rule', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

