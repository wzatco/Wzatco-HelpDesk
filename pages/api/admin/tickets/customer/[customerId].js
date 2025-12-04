import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { customerId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    // Fetch all tickets for this customer, ordered by creation date (newest first)
    const tickets = await prisma.conversation.findMany({
      where: {
        customerId: customerId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      tickets: tickets,
      count: tickets.length
    });

  } catch (error) {
    console.error('Error fetching customer tickets:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

