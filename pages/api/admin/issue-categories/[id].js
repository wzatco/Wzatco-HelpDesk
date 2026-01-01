import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const category = await prisma.issueCategory.findUnique({
        where: { id }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      return res.status(200).json({
        success: true,
        category
      });
    } catch (error) {
      console.error('Error fetching issue category:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching issue category',
        error: error.message
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { name, description, isActive, order } = req.body;

      // Check if category exists
      const existing = await prisma.issueCategory.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // If name is being updated, check for duplicates
      if (name && name.trim() !== existing.name) {
        const duplicate = await prisma.issueCategory.findUnique({
          where: { name: name.trim() }
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: 'Category with this name already exists'
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive === true || isActive === 1;
      if (order !== undefined) updateData.order = parseInt(order) || 0;

      const category = await prisma.issueCategory.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json({
        success: true,
        category
      });
    } catch (error) {
      console.error('Error updating issue category:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating issue category',
        error: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if category exists
      const existing = await prisma.issueCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { conversations: true }
          }
        }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category is used in any tickets
      if (existing._count.conversations > 0) {
        // Soft delete - set isActive to false
        const category = await prisma.issueCategory.update({
          where: { id },
          data: { isActive: false }
        });

        return res.status(200).json({
          success: true,
          category,
          message: 'Category deactivated (soft delete) because it is used in tickets'
        });
      }

      // Hard delete if not used
      await prisma.issueCategory.delete({
        where: { id }
      });

      return res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting issue category:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting issue category',
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

