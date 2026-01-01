import prisma from '@/lib/prisma';

// Widget API - Fetch accessories for ticket creation


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const accessories = await prisma.accessory.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      accessories: accessories
    });

  } catch (error) {
    console.error('Error fetching accessories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

