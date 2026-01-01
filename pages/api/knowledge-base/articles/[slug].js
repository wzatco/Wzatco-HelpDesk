import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  const { slug, category } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  if (!slug) {
    return res.status(400).json({ message: 'Article slug is required' });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
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

    if (!article || article.status !== 'published' || article.isPublic === false) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Increment view count - count every view, not per user/browser
    await prisma.article.update({
      where: { slug },
      data: { views: (article.views || 0) + 1 }
    });

    res.status(200).json({
      article: {
        ...article,
        views: (article.views || 0) + 1, // Return updated view count
        tags: article.tags ? JSON.parse(article.tags) : [],
        contentType: article.contentType || 'richtext' // Include contentType
      }
    });
  } catch (error) {
    console.error('Error fetching public article:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}


