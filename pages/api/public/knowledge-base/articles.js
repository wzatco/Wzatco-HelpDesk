// Public API - Fetch all published Knowledge Base articles
import { PrismaClient } from '@prisma/client';
import { blocksToPlainText, isBlocksContent } from '@/utils/blockRenderer';

// Prisma singleton pattern
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
    const { category, categoryId, search } = req.query;
    
    // Build where clause - ONLY published and public articles (strict filter)
    const where = {
      status: 'published', // Must be published by admin
      isPublic: true, // Must be marked as public
    };
    
    // Support both 'category' and 'categoryId' for backward compatibility
    const selectedCategoryId = categoryId || category;
    if (selectedCategoryId && selectedCategoryId !== 'all') {
      where.categoryId = selectedCategoryId;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        contentType: true,
        slug: true,
        tags: true,
        views: true,
        createdAt: true,
        updatedAt: true,
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

    // Helper function to strip HTML and get clean excerpt
    const getCleanExcerpt = (content, contentType, length = 200) => {
      if (!content) return '';
      
      // Check if content is blocks format
      if (isBlocksContent(content, contentType)) {
        try {
          const plainText = blocksToPlainText(content);
          // Only return if conversion was successful and doesn't contain JSON markers
          if (plainText && plainText.length > 0 && !plainText.includes('"type"') && !plainText.includes('"id"')) {
            return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
          }
        } catch (e) {
          // If conversion fails, fall through to HTML stripping
          console.warn('Error converting blocks to plain text in excerpt:', e);
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

    // Parse tags and format for public display
    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: getCleanExcerpt(article.content, article.contentType, 200),
      contentType: article.contentType,
      category: article.category ? {
        id: article.category.id,
        name: article.category.name,
        slug: article.category.slug
      } : null,
      tags: article.tags ? JSON.parse(article.tags) : [],
      views: article.views || 0,
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

