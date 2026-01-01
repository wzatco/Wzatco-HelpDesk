import prisma, { ensurePrismaConnected } from '../../../lib/prisma';

/**
 * POST /api/admin/seed-roles
 * Seeds default roles including Department Head
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensurePrismaConnected();

    const defaultRoles = [
      {
        title: 'Department Head',
        displayAs: 'Department Head',
        hasSuperPower: false
      },
      {
        title: 'Team Leader',
        displayAs: 'Team Leader',
        hasSuperPower: false
      },
      {
        title: 'Supervisor',
        displayAs: 'Supervisor',
        hasSuperPower: false
      },
      {
        title: 'Manager',
        displayAs: 'Manager',
        hasSuperPower: false
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const roleData of defaultRoles) {
      // Check if role already exists
      const existing = await prisma.role.findUnique({
        where: { title: roleData.title }
      });

      if (existing) {
        console.log(`Role "${roleData.title}" already exists, skipping...`);
        skipped++;
        continue;
      }

      // Create role
      await prisma.role.create({
        data: roleData
      });

      console.log(`✓ Created role: ${roleData.title}`);
      created++;
    }

    return res.status(200).json({
      success: true,
      message: `Roles seeded successfully. Created: ${created}, Skipped: ${skipped}`,
      created,
      skipped
    });
  } catch (error) {
    console.error('Error seeding roles:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

