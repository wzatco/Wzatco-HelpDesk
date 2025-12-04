import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get all workflows
      const { policyId } = req.query;

      const where = policyId ? { policyId } : {};

      const workflows = await prisma.sLAWorkflow.findMany({
        where,
        include: {
          policy: {
            select: {
              id: true,
              name: true,
              isActive: true,
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
    }

    if (req.method === 'POST') {
      // Create new workflow
      const {
        policyId,
        name,
        description,
        workflowData,
        isDraft,
        isActive,
      } = req.body;

      if (!policyId || !name) {
        return res.status(400).json({
          success: false,
          message: 'Policy ID and workflow name are required',
        });
      }

      // Check if policy exists
      const policy = await prisma.sLAPolicy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found',
        });
      }

      // If activating this workflow, deactivate others for this policy
      if (isActive) {
        await prisma.sLAWorkflow.updateMany({
          where: {
            policyId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      const workflow = await prisma.sLAWorkflow.create({
        data: {
          policyId,
          name,
          description,
          workflowData: workflowData ? JSON.stringify(workflowData) : null,
          isDraft: isDraft !== undefined ? isDraft : true,
          isActive: isActive || false,
          publishedAt: isActive && !isDraft ? new Date() : null,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Workflow created successfully',
        workflow,
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('SLA Workflow API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

