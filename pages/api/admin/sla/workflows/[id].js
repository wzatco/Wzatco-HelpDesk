import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      // Get single workflow
      const workflow = await prisma.sLAWorkflow.findUnique({
        where: { id },
        include: {
          policy: true,
        },
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found',
        });
      }

      // Parse workflow data
      if (workflow.workflowData) {
        workflow.workflowData = JSON.parse(workflow.workflowData);
      }

      return res.status(200).json({
        success: true,
        workflow,
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Update workflow
      const updateData = { ...req.body };

      // If activating, deactivate others
      if (updateData.isActive === true) {
        const workflow = await prisma.sLAWorkflow.findUnique({
          where: { id },
          select: { policyId: true },
        });

        if (workflow) {
          await prisma.sLAWorkflow.updateMany({
            where: {
              policyId: workflow.policyId,
              id: { not: id },
              isActive: true,
            },
            data: {
              isActive: false,
            },
          });
        }
      }

      // Convert workflow data to JSON string
      if (updateData.workflowData && typeof updateData.workflowData === 'object') {
        updateData.workflowData = JSON.stringify(updateData.workflowData);
      }

      // Set published date if publishing
      if (updateData.isActive && updateData.isDraft === false) {
        updateData.publishedAt = new Date();
      }

      const updatedWorkflow = await prisma.sLAWorkflow.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: 'Workflow updated successfully',
        workflow: updatedWorkflow,
      });
    }

    if (req.method === 'DELETE') {
      // Check if workflow is active
      const workflow = await prisma.sLAWorkflow.findUnique({
        where: { id },
        select: { isActive: true },
      });

      if (workflow?.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete active workflow. Please deactivate it first.',
        });
      }

      await prisma.sLAWorkflow.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Workflow deleted successfully',
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

