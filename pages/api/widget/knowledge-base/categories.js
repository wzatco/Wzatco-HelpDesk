// Widget API - Fetch Knowledge Base categories
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    await ensurePrismaConnected();
    // Get categories that have published articles
    const categories = await prisma.articleCategory.findMany({
      where: {
        isActive: true,
        articles: {
          some: {
            status: 'published',
            isPublic: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    res.status(200).json({ 
      success: true,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description
      }))
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

