// Widget API - Fetch published Knowledge Base articles
import { PrismaClient } from '@prisma/client';
import { blocksToPlainText, isBlocksContent } from '@/utils/blockRenderer';

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

    // Helper function to strip HTML and get clean excerpt (same as public API)
    const getCleanExcerpt = (content, contentType, length = 200) => {
      if (!content) return '';
      
      // Check if content is blocks format
      if (isBlocksContent(content, contentType)) {
        try {
          const plainText = blocksToPlainText(content);
          return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
        } catch (e) {
          // If conversion fails, fall back to HTML stripping
          const text = content.replace(/<[^>]+>/g, '').trim();
          return text.length > length ? text.substring(0, length) + '...' : text;
        }
      }
      
      // 1. Remove <style> and <script> blocks entirely
      let text = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                            
      // 2. Remove all remaining HTML tags
      text = text.replace(/<[^>]+>/g, '');
      
      // 3. Decode common entities
      text = text.replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'")
                 .replace(/&apos;/g, "'");

      // 4. Clean up whitespace (multiple spaces/newlines to single space)
      text = text.replace(/\s+/g, ' ').trim();
      
      // 5. Trim and Truncate
      return text.length > length ? text.substring(0, length) + '...' : text;
    };

    // Parse tags from JSON string and format for widget
    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content,
      contentType: article.contentType,
      slug: article.slug,
      excerpt: getCleanExcerpt(article.content, article.contentType, 200), // Add excerpt field
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

