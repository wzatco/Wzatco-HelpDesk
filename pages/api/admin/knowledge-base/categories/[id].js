import prisma from '@/lib/prisma';
import { generateSlug } from '@/lib/articleSlugGenerator';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Category ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const category = await prisma.articleCategory.findUnique({
        where: { id },
        include: {
          parent: {
            select: { id: true, name: true, slug: true }
          },
          children: {
            select: { id: true, name: true, slug: true, isActive: true, order: true }
          },
          _count: {
            select: { articles: true }
          }
        }
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.status(200).json({ category });
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const existing = await prisma.articleCategory.findUnique({ where: { id } });

      if (!existing) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const {
        name,
        description,
        parentId,
        order,
        isActive
      } = req.body;

      const data = {};

      if (typeof name !== 'undefined') {
        if (!name || name.trim() === '') {
          return res.status(400).json({ message: 'Category name is required' });
        }

        const trimmedName = name.trim();

        const duplicate = await prisma.articleCategory.findFirst({
          where: {
            name: trimmedName,
            NOT: { id }
          }
        });

        if (duplicate) {
          return res.status(409).json({ message: 'Another category with this name already exists' });
        }

        data.name = trimmedName;

        if (trimmedName !== existing.name) {
          let baseSlug = generateSlug(trimmedName);
          let slug = baseSlug;
          let counter = 1;

          while (await prisma.articleCategory.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }

          data.slug = slug;
        }
      }

      if (typeof description !== 'undefined') {
        data.description = description?.trim() || null;
      }

      if (typeof parentId !== 'undefined') {
        if (parentId === id) {
          return res.status(400).json({ message: 'Category cannot be its own parent' });
        }

        if (parentId) {
          const parent = await prisma.articleCategory.findUnique({ where: { id: parentId } });
          if (!parent) {
            return res.status(400).json({ message: 'Selected parent category does not exist' });
          }
        }

        data.parentId = parentId || null;
      }

      if (typeof order !== 'undefined') {
        const parsedOrder = Number(order);
        data.order = Number.isFinite(parsedOrder) ? parsedOrder : 0;
      }

      if (typeof isActive !== 'undefined') {
        data.isActive = Boolean(isActive);
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: 'No fields provided to update' });
      }

      const updatedCategory = await prisma.articleCategory.update({
        where: { id },
        data,
        include: {
          parent: {
            select: { id: true, name: true, slug: true }
          },
          _count: {
            select: { articles: true }
          }
        }
      });

      res.status(200).json({
        message: 'Category updated successfully',
        category: updatedCategory
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    try {
      const category = await prisma.articleCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { articles: true }
          }
        }
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      if (category._count.articles > 0) {
        return res.status(400).json({
          message: 'Cannot delete category while it still has articles. Reassign or remove articles first.'
        });
      }

      const childCount = await prisma.articleCategory.count({
        where: { parentId: id }
      });

      if (childCount > 0) {
        return res.status(400).json({
          message: 'Cannot delete category while it has child categories. Reassign or remove child categories first.'
        });
      }

      await prisma.articleCategory.delete({ where: { id } });

      res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}


