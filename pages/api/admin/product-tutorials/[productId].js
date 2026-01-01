// API Route for Product Tutorial by Product ID
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  const { productId } = req.query;

  if (req.method === 'GET') {
    try {
      const tutorial = await prisma.productTutorial.findUnique({
        where: { productId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              isActive: true
            }
          }
        }
      });

      if (!tutorial) {
        return res.status(404).json({ success: false, message: 'Tutorial not found' });
      }

      res.status(200).json({ success: true, tutorial });
    } catch (error) {
      console.error('Error fetching product tutorial:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { manualLink, demoVideoLink, cleaningVideoLink } = req.body;

      const tutorial = await prisma.productTutorial.update({
        where: { productId },
        data: {
          manualLink: manualLink !== undefined ? manualLink : undefined,
          demoVideoLink: demoVideoLink !== undefined ? demoVideoLink : undefined,
          cleaningVideoLink: cleaningVideoLink !== undefined ? cleaningVideoLink : undefined
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              isActive: true
            }
          }
        }
      });

      res.status(200).json({ success: true, tutorial });
    } catch (error) {
      console.error('Error updating product tutorial:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.productTutorial.delete({
        where: { productId }
      });

      res.status(200).json({ success: true, message: 'Tutorial deleted successfully' });
    } catch (error) {
      console.error('Error deleting product tutorial:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

