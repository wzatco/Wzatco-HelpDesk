import prisma from '../../../../../lib/prisma';

/**
 * PUT /api/admin/worklogs/reasons/[id]
 * Update a worklog reason
 * 
 * DELETE /api/admin/worklogs/reasons/[id]
 * Soft delete (deactivate) a worklog reason
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Reason ID is required'
    });
  }

  if (req.method === 'PUT') {
    try {
      const { name, type, isActive } = req.body;

      // Validate that at least one field is provided
      if (name === undefined && type === undefined && isActive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one field (name, type, isActive) must be provided'
        });
      }

      // Validate type if provided
      if (type && !['BREAK', 'WORK', 'OTHER'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'type must be one of: BREAK, WORK, OTHER'
        });
      }

      // Check if reason exists
      const existingReason = await prisma.worklogReason.findUnique({
        where: { id }
      });

      if (!existingReason) {
        return res.status(404).json({
          success: false,
          message: 'Worklog reason not found'
        });
      }

      // Check for duplicate name if name is being changed
      if (name && name !== existingReason.name) {
        const duplicate = await prisma.worklogReason.findUnique({
          where: { name }
        });
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'A reason with this name already exists'
          });
        }
      }

      // Build update data
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update the reason
      const updatedReason = await prisma.worklogReason.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json({
        success: true,
        data: updatedReason
      });

    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A reason with this name already exists'
        });
      }
      console.error('Error updating worklog reason:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if reason exists
      const existingReason = await prisma.worklogReason.findUnique({
        where: { id }
      });

      if (!existingReason) {
        return res.status(404).json({
          success: false,
          message: 'Worklog reason not found'
        });
      }

      // Check if any worklogs are using this reason
      const worklogCount = await prisma.worklog.count({
        where: {
          stopReason: existingReason.name
        }
      });

      // If worklogs exist, soft delete (deactivate) instead of hard delete
      if (worklogCount > 0) {
        const deactivatedReason = await prisma.worklogReason.update({
          where: { id },
          data: { isActive: false }
        });

        return res.status(200).json({
          success: true,
          message: `Reason deactivated (${worklogCount} worklog(s) are using this reason)`,
          data: deactivatedReason,
          softDelete: true
        });
      }

      // If no worklogs use this reason, hard delete
      await prisma.worklogReason.delete({
        where: { id }
      });

      return res.status(200).json({
        success: true,
        message: 'Reason deleted successfully',
        softDelete: false
      });

    } catch (error) {
      console.error('Error deleting worklog reason:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

