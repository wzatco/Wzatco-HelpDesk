import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          accessories: {
            orderBy: { name: 'asc' },
            include: {
              _count: {
                select: {
                  conversations: true
                }
              }
            }
          },
          documents: {
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              conversations: true,
              accessories: true
            }
          }
        }
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.status(200).json({ product });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { name, description, category, imageUrl, isActive } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (category !== undefined) updateData.category = category?.trim() || null;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Check if name change would conflict
      if (name) {
        const existing = await prisma.product.findUnique({
          where: { name: name.trim() }
        });
        if (existing && existing.id !== id) {
          return res.status(409).json({ message: 'Product with this name already exists' });
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          accessories: {
            orderBy: { name: 'asc' }
          },
          _count: {
            select: {
              conversations: true,
              accessories: true
            }
          }
        }
      });

      res.status(200).json({ product });
    } catch (error) {
      console.error('Error updating product:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if product has models or tickets
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              accessories: true,
              conversations: true
            }
          }
        }
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (product._count.accessories > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete product with existing accessories. Please delete or reassign accessories first.' 
        });
      }

      if (product._count.conversations > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete product with associated tickets. Please reassign tickets first.' 
        });
      }

      await prisma.product.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

