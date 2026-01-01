import prisma, { ensurePrismaConnected } from '@/lib/prisma';

// Prisma singleton pattern

export default async function handler(req, res) {
  await ensurePrismaConnected();
  try {
    if (req.method === 'GET') {
      // Get all SLA policies
      const policies = await prisma.sLAPolicy.findMany({
        include: {
          workflows: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              version: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              workflows: true,
              timers: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({
        success: true,
        policies,
      });
    }

    if (req.method === 'POST') {
      // Create new SLA policy
      const {
        name,
        description,
        isDefault,
        isActive,
        lowResponseTime,
        lowResolutionTime,
        mediumResponseTime,
        mediumResolutionTime,
        highResponseTime,
        highResolutionTime,
        urgentResponseTime,
        urgentResolutionTime,
        useBusinessHours,
        businessHours,
        timezone,
        holidays,
        escalationLevel1,
        escalationLevel2,
        pauseOnWaiting,
        pauseOnHold,
        pauseOffHours,
        departmentIds,
        categoryIds,
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Policy name is required',
        });
      }

      // If this is set as default, unset other default policies
      if (isDefault) {
        await prisma.sLAPolicy.updateMany({
          where: {
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Create the policy
      const policy = await prisma.sLAPolicy.create({
        data: {
          name,
          description,
          isDefault: isDefault || false,
          isActive: isActive !== undefined ? isActive : true,
          lowResponseTime,
          lowResolutionTime,
          mediumResponseTime,
          mediumResolutionTime,
          highResponseTime,
          highResolutionTime,
          urgentResponseTime,
          urgentResolutionTime,
          useBusinessHours: useBusinessHours !== undefined ? useBusinessHours : true,
          businessHours: businessHours ? JSON.stringify(businessHours) : null,
          timezone: timezone || 'UTC',
          holidays: holidays ? JSON.stringify(holidays) : null,
          escalationLevel1: escalationLevel1 || 80,
          escalationLevel2: escalationLevel2 || 95,
          pauseOnWaiting: pauseOnWaiting !== undefined ? pauseOnWaiting : true,
          pauseOnHold: pauseOnHold !== undefined ? pauseOnHold : true,
          pauseOffHours: pauseOffHours !== undefined ? pauseOffHours : true,
          departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
          categoryIds: categoryIds ? JSON.stringify(categoryIds) : null,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'SLA policy created successfully',
        policy,
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

