// Admin API - Fetch Callbacks
import { PrismaClient } from '@prisma/client';

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { status } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const callbacks = await prisma.scheduledCallback.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        scheduledTime: 'asc'
      }
    });

    res.status(200).json({ success: true, callbacks });
  } catch (error) {
    console.error('Error fetching callbacks:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

