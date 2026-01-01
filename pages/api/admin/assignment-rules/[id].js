import { PrismaClient } from '@prisma/client';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

// Prisma singleton pattern
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  const userId = getCurrentUserId(req);
  const { id } = req.query;
  
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
      const rule = await prisma.assignmentRule.findUnique({
        where: { id }
      });

      if (!rule) {
        return res.status(404).json({
          success: false,
          message: 'Assignment rule not found'
        });
      }

      return res.status(200).json({
        success: true,
        rule: {
          ...rule,
          config: rule.config ? JSON.parse(rule.config) : {}
        }
      });
    } catch (error) {
      console.error('Error fetching assignment rule:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch assignment rule',
        error: error.message
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { name, ruleType, priority, enabled, config, description } = req.body;

      const existingRule = await prisma.assignmentRule.findUnique({
        where: { id }
      });

      if (!existingRule) {
        return res.status(404).json({
          success: false,
          message: 'Assignment rule not found'
        });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (ruleType !== undefined) {
        const validRuleTypes = ['direct_assignment', 'round_robin', 'manual', 'load_based', 'skill_match'];
        if (!validRuleTypes.includes(ruleType)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid rule type'
          });
        }
        updateData.ruleType = ruleType;
      }
      if (priority !== undefined) updateData.priority = priority;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (config !== undefined) updateData.config = config ? JSON.stringify(config) : null;
      if (description !== undefined) updateData.description = description;

      const rule = await prisma.assignmentRule.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json({
        success: true,
        rule: {
          ...rule,
          config: rule.config ? JSON.parse(rule.config) : {}
        }
      });
    } catch (error) {
      console.error('Error updating assignment rule:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update assignment rule',
        error: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.assignmentRule.delete({
        where: { id }
      });

      return res.status(200).json({
        success: true,
        message: 'Assignment rule deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting assignment rule:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete assignment rule',
        error: error.message
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
