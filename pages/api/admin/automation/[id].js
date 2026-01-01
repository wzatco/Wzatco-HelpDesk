import { PrismaClient } from '@prisma/client';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  const { id } = req.query;
  const userId = getCurrentUserId(req);

  if (req.method === 'GET') {
    try {
      // Check permission to view automation rules
      if (userId) {
        await checkPermissionOrFail(userId, 'automation', res);
      }

      const workflow = await prisma.workflow.findUnique({
        where: { id },
        include: {
          conditions: {
            orderBy: {
              id: 'asc',
            },
          },
          actions: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found',
        });
      }

      return res.status(200).json({
        success: true,
        workflow,
      });
    } catch (error) {
      console.error('Error fetching workflow:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow',
        error: error.message,
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      // Check permission to update automation rules
      if (userId) {
        await checkPermissionOrFail(userId, 'automation', res);
      }

      const { name, trigger, description, isActive, conditions, actions } = req.body;

      // Validation
      if (!name || !trigger) {
        return res.status(400).json({
          success: false,
          message: 'Name and trigger are required',
        });
      }

      if (!actions || actions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one action is required',
        });
      }

      // Check if workflow exists
      const existingWorkflow = await prisma.workflow.findUnique({
        where: { id },
      });

      if (!existingWorkflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found',
        });
      }

      // Delete old conditions and actions, then recreate them
      await prisma.workflowCondition.deleteMany({
        where: { workflowId: id },
      });

      await prisma.workflowAction.deleteMany({
        where: { workflowId: id },
      });

      // Update workflow and recreate conditions/actions
      const workflow = await prisma.workflow.update({
        where: { id },
        data: {
          name,
          trigger,
          description: description || null,
          isActive: isActive !== undefined ? isActive : existingWorkflow.isActive,
          conditions: {
            create: (conditions || []).map((condition) => ({
              field: condition.field,
              operator: condition.operator,
              value: condition.value,
            })),
          },
          actions: {
            create: (actions || []).map((action, index) => ({
              actionType: action.actionType,
              payload: typeof action.payload === 'string' ? action.payload : JSON.stringify(action.payload || {}),
              order: action.order !== undefined ? action.order : index,
            })),
          },
        },
        include: {
          conditions: true,
          actions: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Workflow updated successfully',
        workflow,
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update workflow',
        error: error.message,
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      // Check permission to update automation rules
      if (userId) {
        await checkPermissionOrFail(userId, 'automation', res);
      }

      const { isActive } = req.body;

      if (isActive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isActive is required',
        });
      }

      const workflow = await prisma.workflow.update({
        where: { id },
        data: { isActive },
        include: {
          conditions: true,
          actions: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Workflow status updated successfully',
        workflow,
      });
    } catch (error) {
      console.error('Error updating workflow status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update workflow status',
        error: error.message,
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check permission to delete automation rules
      if (userId) {
        await checkPermissionOrFail(userId, 'automation', res);
      }

      // Check if workflow exists
      const workflow = await prisma.workflow.findUnique({
        where: { id },
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found',
        });
      }

      // Delete workflow (cascade will delete conditions and actions)
      await prisma.workflow.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Workflow deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete workflow',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  });
}

