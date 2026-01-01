// GET /api/widget/chats - Get all chats
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
    const { status, assignedTo, unique } = req.query;

    let chats;

    if (unique === 'true') {
      // Get all waiting and active chats
      const allChats = await prisma.liveChat.findMany({
        where: {
          OR: [
            { status: 'waiting' },
            { status: 'active' },
            ...(assignedTo ? [{ assignedAgentId: assignedTo, status: { in: ['waiting', 'active'] } }] : []),
          ],
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 200,
        include: {
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      // Group by customerEmail and keep only the latest chat per customer
      const chatMap = new Map();
      allChats.forEach(chat => {
        const email = chat.customerEmail.toLowerCase();
        if (!chatMap.has(email) || new Date(chat.lastMessageAt) > new Date(chatMap.get(email).lastMessageAt)) {
          chatMap.set(email, chat);
        }
      });

      chats = Array.from(chatMap.values()).sort((a, b) => 
        new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );
    } else {
      const where = {};
      if (status) where.status = status;
      if (assignedTo) where.assignedAgentId = assignedTo;

      chats = await prisma.liveChat.findMany({
        where,
        include: {
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1, // Just get the last message
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 100,
      });
    }

    console.log(`📊 Fetched ${chats.length} chats from database`);
    return res.status(200).json({ success: true, data: chats });
  } catch (error) {
    console.error('❌ Error fetching chats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch chats',
      message: error.message,
    });
  }
}

