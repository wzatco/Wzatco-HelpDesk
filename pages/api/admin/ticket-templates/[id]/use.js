import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Increment usage count when a template is used
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const template = await prisma.ticketTemplate.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    res.status(200).json({ success: true, template });
  } catch (error) {
    console.error('Error incrementing template usage:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

