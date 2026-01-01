// Widget API - Fetch single Knowledge Base article
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    await ensurePrismaConnected();
    const { id } = req.query;

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!article) {
      return res.status(404).json({ 
        success: false,
        message: 'Article not found' 
      });
    }

    // Only return if published and public
    if (article.status !== 'published' || !article.isPublic) {
      return res.status(404).json({ 
        success: false,
        message: 'Article not found' 
      });
    }

    // Increment view count
    await prisma.article.update({
      where: { id },
      data: { views: (article.views || 0) + 1 }
    });

    res.status(200).json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        content: article.content,
        contentType: article.contentType,
        slug: article.slug,
        category: article.category ? {
          id: article.category.id,
          name: article.category.name,
          slug: article.category.slug
        } : null,
        tags: article.tags ? JSON.parse(article.tags) : [],
        views: (article.views || 0) + 1,
        helpfulVotes: article.helpfulVotes || 0,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

