import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

export default async function handler(req, res) {
  const userId = getCurrentUserId(req);
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await checkPermissionOrFail(userId, 'admin.tickets', res);
  } catch (permError) {
    return res.status(403).json({ message: 'Permission denied' });
  }

  if (req.method === 'GET') {
    try {
      const rules = await prisma.assignmentRule.findMany({
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return res.status(200).json({
        success: true,
        rules: rules.map(rule => ({
          ...rule,
          config: rule.config ? JSON.parse(rule.config) : {}
        }))
      });
    } catch (error) {
      console.error('Error fetching assignment rules:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch assignment rules',
        error: error.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, ruleType, priority, enabled, config, description } = req.body;

      if (!name || !ruleType) {
        return res.status(400).json({
          success: false,
          message: 'Name and rule type are required'
        });
      }

      // Validate rule type
      const validRuleTypes = ['direct_assignment', 'round_robin', 'manual', 'load_based', 'skill_match'];
      if (!validRuleTypes.includes(ruleType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid rule type'
        });
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

      return res.status(201).json({
        success: true,
        rule: {
          ...rule,
          config: rule.config ? JSON.parse(rule.config) : {}
        }
      });
    } catch (error) {
      console.error('Error creating assignment rule:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create assignment rule',
        error: error.message
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
