// GET /api/widget/chats/[id] - Get single chat with messages
import prisma from '@/lib/prisma';

// Singleton pattern for PrismaClient
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    const chat = await prisma.liveChat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error('❌ Error fetching chat:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch chat',
      message: error.message,
    });
  }
}

