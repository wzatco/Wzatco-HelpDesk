import prisma from '@/lib/prisma';
import { generateUniqueSlug } from '@/lib/articleSlugGenerator';


export default async function handler(req, res) {

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
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
        return res.status(404).json({ message: 'Article not found' });
      }

      res.status(200).json({
        article: {
          ...article,
          tags: article.tags ? JSON.parse(article.tags) : []
        }
      });
    } catch (error) {
      console.error('Error fetching article:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } 
  } else if (req.method === 'PATCH') {
    try {
      const { title, content, category, status, tags, isPublic, updatedByName, contentType } = req.body;

      // Check if article exists
      const existingArticle = await prisma.article.findUnique({
        where: { id }
      });

      if (!existingArticle) {
        return res.status(404).json({ message: 'Article not found' });
      }

      if (!title || title.trim() === '') {
        return res.status(400).json({ message: 'Title is required' });
      }

      // Generate new slug if title changed
      let slug = existingArticle.slug;
      if (title !== existingArticle.title) {
        const existingSlugs = await prisma.article.findMany({
          where: { id: { not: id } },
          select: { slug: true }
        });
        slug = generateUniqueSlug(title, existingSlugs.map(a => a.slug));
      }

      // Get admin info from headers (if available)
      const adminName = updatedByName || 'Admin';

      const article = await prisma.article.update({
        where: { id },
        data: {
          title: title.trim(),
          content: content || '',
          contentType: contentType === 'html' ? 'html' : 'richtext',
          slug,
          categoryId: category || null,
          status: status || existingArticle.status, // Allow admin to change status (pending → published)\n          tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
          isPublic: isPublic !== false,
          updatedByName: adminName
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

      res.status(200).json({ 
        message: 'Article updated successfully',
        article: {
          ...article,
          tags: article.tags ? JSON.parse(article.tags) : []
        }
      });
    } catch (error) {
      console.error('Error updating article:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } 
  } else if (req.method === 'DELETE') {
    try {
      // Check if article exists
      const existingArticle = await prisma.article.findUnique({
        where: { id }
      });

      if (!existingArticle) {
        return res.status(404).json({ message: 'Article not found' });
      }

      await prisma.article.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Article deleted successfully' });
    } catch (error) {
      console.error('Error deleting article:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } 
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
