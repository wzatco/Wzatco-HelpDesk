// Public API - Fetch active Knowledge Base categories
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    await ensurePrismaConnected();
    // Get categories that have published, public articles
    const categories = await prisma.articleCategory.findMany({
      where: {
        isActive: true
      },
      include: {
        _count: {
          select: {
            articles: {
              where: {
                status: 'published',
                isPublic: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Filter out categories with no published articles
    const activeCategories = categories.filter(cat => cat._count.articles > 0);

    const formattedCategories = activeCategories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      articleCount: category._count.articles
    }));
    
    res.status(200).json({ 
      success: true,
      categories: formattedCategories 
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

