import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch ticket counts by status
    const [
      totalTickets,
      openTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets
    ] = await Promise.all([
      // Total tickets
      prisma.conversation.count(),
      
      // Open tickets
      prisma.conversation.count({
        where: { status: 'open' }
      }),
      
      // Pending tickets
      prisma.conversation.count({
        where: { status: 'pending' }
      }),
      
      // Resolved tickets
      prisma.conversation.count({
        where: { status: 'resolved' }
      }),
      
      // Closed tickets
      prisma.conversation.count({
        where: { status: 'closed' }
      })
    ]);

    res.status(200).json({
      total: totalTickets,
      open: openTickets,
      pending: pendingTickets,
      resolved: resolvedTickets,
      closed: closedTickets
    });

  } catch (error) {
    console.error('Error fetching ticket counts:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
