import prisma from '@/lib/prisma';

// Prisma singleton pattern

export default async function handler(req, res) {

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      // Get single policy
      const policy = await prisma.sLAPolicy.findUnique({
        where: { id },
        include: {
          workflows: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              workflows: true,
              timers: true,
            },
          },
        },
      });

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found',
        });
      }

      // Parse JSON fields
      if (policy.businessHours) {
        policy.businessHours = JSON.parse(policy.businessHours);
      }
      if (policy.holidays) {
        policy.holidays = JSON.parse(policy.holidays);
      }
      if (policy.departmentIds) {
        policy.departmentIds = JSON.parse(policy.departmentIds);
      }
      if (policy.categoryIds) {
        policy.categoryIds = JSON.parse(policy.categoryIds);
      }

      return res.status(200).json({
        success: true,
        policy,
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Update policy
      const updateData = { ...req.body };

      // If setting as default, unset others
      if (updateData.isDefault === true) {
        await prisma.sLAPolicy.updateMany({
          where: {
            id: { not: id },
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Convert objects to JSON strings
      if (updateData.businessHours && typeof updateData.businessHours === 'object') {
        updateData.businessHours = JSON.stringify(updateData.businessHours);
      }
      if (updateData.holidays && Array.isArray(updateData.holidays)) {
        updateData.holidays = JSON.stringify(updateData.holidays);
      }
      if (updateData.departmentIds && Array.isArray(updateData.departmentIds)) {
        updateData.departmentIds = JSON.stringify(updateData.departmentIds);
      }
      if (updateData.categoryIds && Array.isArray(updateData.categoryIds)) {
        updateData.categoryIds = JSON.stringify(updateData.categoryIds);
      }

      const policy = await prisma.sLAPolicy.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: 'Policy updated successfully',
        policy,
      });
    }

    if (req.method === 'DELETE') {
      // Check if policy has active timers
      const activeTimers = await prisma.sLATimer.count({
        where: {
          policyId: id,
          status: 'running',
        },
      });

      if (activeTimers > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete policy with ${activeTimers} active timers. Please stop all timers first.`,
        });
      }

      // Delete policy (cascades to workflows)
      await prisma.sLAPolicy.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Policy deleted successfully',
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('SLA Policy API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

