import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const model = await prisma.model.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          documents: {
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              conversations: true
            }
          }
        }
      });

      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }

      // Parse specifications if it's a JSON string
      const modelData = {
        ...model,
        specifications: model.specifications ? (typeof model.specifications === 'string' ? JSON.parse(model.specifications) : model.specifications) : null
      };

      res.status(200).json({ model: modelData });
    } catch (error) {
      console.error('Error fetching model:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { name, description, specifications, isActive, productId } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (specifications !== undefined) updateData.specifications = specifications ? JSON.stringify(specifications) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (productId !== undefined) updateData.productId = productId;

      // Check if name change would conflict
      if (name) {
        const currentModel = await prisma.model.findUnique({ where: { id } });
        if (!currentModel) {
          return res.status(404).json({ message: 'Model not found' });
        }

        const existing = await prisma.model.findUnique({
          where: {
            productId_name: {
              productId: productId || currentModel.productId,
              name: name.trim()
            }
          }
        });
        if (existing && existing.id !== id) {
          return res.status(409).json({ message: 'Model with this name already exists for this product' });
        }
      }

      const model = await prisma.model.update({
        where: { id },
        data: updateData,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          documents: {
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              conversations: true
            }
          }
        }
      });

      // Parse specifications
      const modelData = {
        ...model,
        specifications: model.specifications ? (typeof model.specifications === 'string' ? JSON.parse(model.specifications) : model.specifications) : null
      };

      res.status(200).json({ model: modelData });
    } catch (error) {
      console.error('Error updating model:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Model not found' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Model with this name already exists for this product' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if model has tickets
      const model = await prisma.model.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              conversations: true,
              documents: true
            }
          }
        }
      });

      if (!model) {
        return res.status(404).json({ message: 'Model not found' });
      }

      if (model._count.conversations > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete model with associated tickets. Please reassign tickets first.' 
        });
      }

      await prisma.model.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Model deleted successfully' });
    } catch (error) {
      console.error('Error deleting model:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Model not found' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

