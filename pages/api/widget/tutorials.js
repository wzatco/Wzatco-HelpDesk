// Widget API - Fetch Product Tutorials
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { productId } = req.query;

    if (productId) {
      // Get tutorial for specific product
      const tutorial = await prisma.productTutorial.findUnique({
        where: { productId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              category: true
            }
          }
        }
      });

      if (!tutorial) {
        return res.status(404).json({ success: false, message: 'Tutorial not found' });
      }

      return res.status(200).json({ success: true, tutorial });
    } else {
      // Get all tutorials with products
      const tutorials = await prisma.productTutorial.findMany({
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              category: true
            }
          }
        },
        where: {
          product: {
            isActive: true
          }
        }
      });

      res.status(200).json({ success: true, tutorials });
    }
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
