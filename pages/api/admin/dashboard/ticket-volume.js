import prisma from '@/lib/prisma';

// Use singleton pattern for Prisma client
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const volumeData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Get data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Get created tickets
      const created = await prisma.conversation.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });
      
      // Get resolved tickets
      const resolved = await prisma.conversation.count({
        where: {
          status: 'resolved',
          updatedAt: {
            gte: date,
            lt: nextDate
          }
        }
      });
      
      // Get pending tickets at end of day
      const pending = await prisma.conversation.count({
        where: {
          status: { in: ['open', 'pending'] },
          createdAt: {
            lte: nextDate
          }
        }
      });
      
      volumeData.push({
        date: date.toISOString().split('T')[0],
        day: days[date.getDay()],
        created,
        resolved,
        pending
      });
    }

    res.status(200).json({
      success: true,
      volumeData
    });

  } catch (error) {
    console.error('Error fetching ticket volume:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
}

