// API Route for Product Tutorials
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method === 'GET') {
  try {
      await ensurePrismaConnected();
      const tutorials = await prisma.productTutorial.findMany({
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
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      res.status(200).json({ success: true, tutorials });
    } catch (error) {
      console.error('Error fetching product tutorials:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { productId, manualLink, demoVideoLink, cleaningVideoLink } = req.body;

      if (!productId) {
        return res.status(400).json({ success: false, message: 'Product ID is required' });
      }

      // Check if tutorial already exists for this product
      const existing = await prisma.productTutorial.findUnique({
        where: { productId }
      });

      let tutorial;
      if (existing) {
        // Update existing
        tutorial = await prisma.productTutorial.update({
          where: { productId },
          data: {
            manualLink: manualLink || null,
            demoVideoLink: demoVideoLink || null,
            cleaningVideoLink: cleaningVideoLink || null
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
      } else {
        // Create new
        tutorial = await prisma.productTutorial.create({
          data: {
            productId,
            manualLink: manualLink || null,
            demoVideoLink: demoVideoLink || null,
            cleaningVideoLink: cleaningVideoLink || null
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
      }

      res.status(200).json({ success: true, tutorial });
    } catch (error) {
      console.error('Error saving product tutorial:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

