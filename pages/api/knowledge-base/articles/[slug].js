import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    res.status(200).json({
      article: {
        ...article,
        tags: article.tags ? JSON.parse(article.tags) : []
      }
    });
  } catch (error) {
    console.error('Error fetching public article:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}


