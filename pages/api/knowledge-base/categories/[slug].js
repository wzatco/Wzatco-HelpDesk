import prisma from '@/lib/prisma';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { slug } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  if (!slug) {
    return res.status(400).json({ message: 'Category slug is required' });
  }

  try {
    const category = await prisma.articleCategory.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        isActive: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!category || !category.isActive) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const articles = await prisma.article.findMany({
      where: {
        categoryId: category.id,
        status: 'published',
        isPublic: true
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const formattedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags ? JSON.parse(article.tags) : [],
      excerpt: article.content
        ? article.content.replace(/<[^>]*>/g, '').slice(0, 200).trim() + (article.content.length > 200 ? '…' : '')
        : ''
    }));

    res.status(200).json({
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        parent: category.parent
      },
      articles: formattedArticles
    });
  } catch (error) {
    console.error('Error fetching category articles:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}


