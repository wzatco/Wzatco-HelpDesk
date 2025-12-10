// Widget API - Get Callback by ID
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
    const { id } = req.query;

    const callback = await prisma.scheduledCallback.findUnique({
      where: { id }
    });

    if (!callback) {
      return res.status(404).json({ success: false, message: 'Callback not found' });
    }

    res.status(200).json({ success: true, callback });
  } catch (error) {
    console.error('Error fetching callback:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

