import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const accessory = await prisma.accessory.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          _count: {
            select: {
              conversations: true
            }
          }
        }
      });

      if (!accessory) {
        return res.status(404).json({ message: 'Accessory not found' });
      }

      // Parse specifications if it's a JSON string
      const accessoryData = {
        ...accessory,
        specifications: accessory.specifications ? (typeof accessory.specifications === 'string' ? JSON.parse(accessory.specifications) : accessory.specifications) : null
      };

      res.status(200).json({ accessory: accessoryData });
    } catch (error) {
      console.error('Error fetching accessory:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { name, description, imageUrl, specifications, isActive, productId } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
      if (specifications !== undefined) updateData.specifications = specifications ? JSON.stringify(specifications) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (productId !== undefined) updateData.productId = productId;

      // Check if name change would conflict
      if (name) {
        const currentAccessory = await prisma.accessory.findUnique({ where: { id } });
        if (!currentAccessory) {
          return res.status(404).json({ message: 'Accessory not found' });
        }

        const existing = await prisma.accessory.findUnique({
          where: {
            productId_name: {
              productId: productId || currentAccessory.productId,
              name: name.trim()
            }
          }
        });
        if (existing && existing.id !== id) {
          return res.status(409).json({ message: 'Accessory with this name already exists for this product' });
        }
      }

      const accessory = await prisma.accessory.update({
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
          _count: {
            select: {
              conversations: true
            }
          }
        }
      });

      // Parse specifications
      const accessoryData = {
        ...accessory,
        specifications: accessory.specifications ? (typeof accessory.specifications === 'string' ? JSON.parse(accessory.specifications) : accessory.specifications) : null
      };

      res.status(200).json({ accessory: accessoryData });
    } catch (error) {
      console.error('Error updating accessory:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Accessory not found' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Accessory with this name already exists for this product' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if accessory has tickets
      const accessory = await prisma.accessory.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              conversations: true
            }
          }
        }
      });

      if (!accessory) {
        return res.status(404).json({ message: 'Accessory not found' });
      }

      if (accessory._count.conversations > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete accessory with associated tickets. Please reassign tickets first.' 
        });
      }

      await prisma.accessory.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Accessory deleted successfully' });
    } catch (error) {
      console.error('Error deleting accessory:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Accessory not found' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

