import prisma, { ensurePrismaConnected } from '@/lib/prisma';
import { generateUniqueSlug } from '@/lib/articleSlugGenerator';


export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { status, category, search } = req.query;
      
      const where = {};
      
      if (status && status !== 'all') {
        where.status = status;
      }
      
      if (category && category !== 'all') {
        where.categoryId = category;
      }
      
      if (search) {
        // SQLite doesn't support case-insensitive mode, so we'll filter client-side
        // For now, use case-sensitive search
        where.OR = [
          { title: { contains: search } },
          { content: { contains: search } }
        ];
      }

      const articles = await prisma.article.findMany({
        where,
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

      // Parse tags from JSON string
      const articlesWithParsedTags = articles.map(article => ({
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : []
      }));
      
      res.status(200).json({ articles: articlesWithParsedTags });
    } catch (error) {
      console.error('Error fetching articles:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { title, content, category, status, tags, isPublic, createdByName, contentType } = req.body;

      if (!title || title.trim() === '') {
        return res.status(400).json({ message: 'Title is required' });
      }

      // Generate unique slug
      const existingSlugs = await prisma.article.findMany({
        select: { slug: true }
      });
      const slug = generateUniqueSlug(title, existingSlugs.map(a => a.slug));

      // Get admin info from headers (if available)
      const adminName = createdByName || 'Admin';

      // Determine status: Force 'pending' for agents, allow admins to set status
      const finalStatus = status || 'draft';
      
      const article = await prisma.article.create({
        data: {
          title: title.trim(),
          content: content || '',
          contentType: contentType === 'blocks' ? 'blocks' : contentType === 'html' ? 'html' : 'richtext',
          slug,
          categoryId: category || null,
          status: finalStatus, // Admin can set status, agents will use 'pending' from frontend
          tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
          isPublic: isPublic !== false,
          createdByName: adminName
        },
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

      res.status(201).json({ 
        message: 'Article created successfully',
        article: {
          ...article,
          tags: article.tags ? JSON.parse(article.tags) : []
        }
      });
    } catch (error) {
      console.error('Error creating article:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
