import { PrismaClient } from '@prisma/client';
import { generateSlug } from '@/lib/articleSlugGenerator';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const includeInactive = req.query?.includeInactive === 'true';
      const categories = await prisma.articleCategory.findMany({
        where: includeInactive
          ? undefined
          : {
              isActive: true
            },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              articles: true
            }
          }
        },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ]
      });
      
      res.status(200).json({ categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, parentId, order } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Category name is required' });
      }

      // Check if category with same name already exists
      const existingCategory = await prisma.articleCategory.findUnique({
        where: { name: name.trim() }
      });

      if (existingCategory) {
        return res.status(409).json({ message: 'Category with this name already exists' });
      }

      // Generate slug
      let baseSlug = generateSlug(name);
      let slug = baseSlug;
      let counter = 1;

      // Ensure unique slug
      while (await prisma.articleCategory.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const category = await prisma.articleCategory.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          slug,
          parentId: parentId || null,
          order: order || 0
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      res.status(201).json({ 
        message: 'Category created successfully',
        category 
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
