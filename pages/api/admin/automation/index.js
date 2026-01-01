import prisma, { ensurePrismaConnected } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

// Prisma singleton pattern

export default async function handler(req, res) {
  await ensurePrismaConnected();
  const userId = getCurrentUserId(req);

    if (req.method === 'GET') {
      try {
        // Check permission to view automation rules
        if (userId) {
          await checkPermissionOrFail(userId, 'automation', res);
        }

        const workflows = await prisma.workflow.findMany({
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
          orderBy: {
            createdAt: 'desc',
          },
        });

        return res.status(200).json({
          success: true,
          workflows,
        });
      } catch (error) {
        console.error('Error fetching workflows:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch workflows',
          error: error.message,
        });
      }
    }

    if (req.method === 'POST') {
      try {
        // Check permission to create automation rules
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

        // Create workflow with conditions and actions
        const workflow = await prisma.workflow.create({
          data: {
            name,
            trigger,
            description: description || null,
            isActive: isActive !== undefined ? isActive : true,
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

        return res.status(201).json({
          success: true,
          message: 'Workflow created successfully',
          workflow,
        });
      } catch (error) {
        console.error('Error creating workflow:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create workflow',
          error: error.message,
        });
      }
    }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  });
}

