import prisma from '../../../lib/prisma';

/**
 * GET /api/admin/seed-reasons
 * Seed default worklog reasons if table is empty
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // Check if reasons already exist
    const existingCount = await prisma.worklogReason.count();

    if (existingCount > 0) {
      return res.status(200).json({
        success: true,
        message: `Worklog reasons already exist (${existingCount} found). No seeding needed.`,
        count: existingCount
      });
    }

    // Create default reasons using createMany
    const defaultReasons = [
      {
        name: 'Break',
        type: 'BREAK',
        isActive: true
      },
      {
        name: 'Meeting',
        type: 'WORK',
        isActive: true
      },
      {
        name: 'End of Shift',
        type: 'OTHER',
        isActive: true
      },
      {
        name: 'Personal Emergency',
        type: 'BREAK',
        isActive: true
      }
    ];

    const result = await prisma.worklogReason.createMany({
      data: defaultReasons,
      skipDuplicates: true // Safety: skip if duplicates exist
    });

    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${result.count} worklog reasons.`,
      count: result.count,
      reasons: defaultReasons
    });

  } catch (error) {
    console.error('Error seeding worklog reasons:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
}

