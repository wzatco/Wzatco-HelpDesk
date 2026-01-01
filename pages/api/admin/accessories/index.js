import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  if (req.method === 'GET') {
    try {
      const { productId, includeInactive = 'false' } = req.query;
      
      const where = {};
      if (productId) {
        where.productId = productId;
      }
      if (includeInactive !== 'true') {
        where.isActive = true;
      }

      const accessories = await prisma.accessory.findMany({
        where,
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
        },
        orderBy: [
          { product: { name: 'asc' } },
          { name: 'asc' }
        ]
      });

      res.status(200).json({ accessories });
    } catch (error) {
      console.error('Error fetching accessories:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { productId, name, description, imageUrl, specifications, isActive = true } = req.body;

      if (!productId || !name || !name.trim()) {
        return res.status(400).json({ message: 'Product ID and accessory name are required' });
      }

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if accessory with same name exists for this product
      const existing = await prisma.accessory.findUnique({
        where: {
          productId_name: {
            productId,
            name: name.trim()
          }
        }
      });

      if (existing) {
        return res.status(409).json({ message: 'Accessory with this name already exists for this product' });
      }

      // Generate meaningful Accessory ID
      const { generateAccessoryId } = await import('@/lib/accessoryIdGenerator');
      const accessoryId = await generateAccessoryId({
        name: name.trim(),
        productName: product.name,
        prisma
      });

      const accessory = await prisma.accessory.create({
        data: {
          id: accessoryId,
          productId,
          name: name.trim(),
          description: description?.trim() || null,
          imageUrl: imageUrl?.trim() || null,
          specifications: specifications ? JSON.stringify(specifications) : null,
          isActive
        },
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

      res.status(201).json({ accessory });
    } catch (error) {
      console.error('Error creating accessory:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Accessory with this name already exists for this product' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

