import prisma from '@/lib/prisma';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { includeInactive = 'false' } = req.query;
      
      const where = {};
      if (includeInactive !== 'true') {
        where.isActive = true;
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          accessories: {
            where: includeInactive !== 'true' ? { isActive: true } : {},
            orderBy: { name: 'asc' }
          },
          _count: {
            select: {
              conversations: true,
              accessories: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.status(200).json({ products });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, category, imageUrl, isActive = true } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Product name is required' });
      }

      // Check if product with same name exists
      const existing = await prisma.product.findUnique({
        where: { name: name.trim() }
      });

      if (existing) {
        return res.status(409).json({ message: 'Product with this name already exists' });
      }

      // Generate meaningful Product ID
      const { generateProductId } = await import('@/lib/productIdGenerator');
      const productId = await generateProductId({
        name: name.trim(),
        category: category?.trim() || null,
        prisma
      });

      const product = await prisma.product.create({
        data: {
          id: productId,
          name: name.trim(),
          description: description?.trim() || null,
          category: category?.trim() || null,
          imageUrl: imageUrl?.trim() || null,
          isActive
        },
        include: {
          accessories: true,
          _count: {
            select: {
              conversations: true,
              accessories: true
            }
          }
        }
      });

      res.status(201).json({ product });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

