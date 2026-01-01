import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const categories = await prisma.issueCategory.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    return res.status(200).json({
      success: true,
      categories: categories.map(cat => cat.name) // Return just names for widget compatibility
    });
  } catch (error) {
    console.error('Error fetching issue categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

