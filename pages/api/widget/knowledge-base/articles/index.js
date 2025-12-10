// Widget API - Fetch published Knowledge Base articles
import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern to prevent connection leaks
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { category, search } = req.query;
    
    // Build where clause - only published and public articles
    const where = {
      status: 'published',
      isPublic: true,
    };
    
    if (category && category !== 'all') {
      where.categoryId = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const { limit } = req.query;
    const takeLimit = limit ? parseInt(limit) : undefined;

    const articles = await prisma.article.findMany({
      where,
      take: takeLimit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parse tags from JSON string and format for widget
    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      slug: article.slug,
      category: article.category ? {
        id: article.category.id,
        name: article.category.name,
        slug: article.category.slug
      } : null,
      tags: article.tags ? JSON.parse(article.tags) : [],
      views: article.views || 0,
      helpfulVotes: article.helpfulVotes || 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    }));
    
    res.status(200).json({ 
      success: true,
      articles: formattedArticles 
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

