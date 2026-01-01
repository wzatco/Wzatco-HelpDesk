import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure Prisma is connected
        const counts = {
      agents: await prisma.agent.count().catch(() => 0),
      users: await prisma.user.count().catch(() => 0),
      customers: await prisma.customer.count().catch(() => 0),
      conversations: await prisma.conversation.count().catch(() => 0),
      departments: await prisma.department.count().catch(() => 0),
      roles: await prisma.role.count().catch(() => 0),
      slaPolicies: await prisma.sLAPolicy.count().catch(() => 0),
      slaTimers: await prisma.sLATimer.count().catch(() => 0),
      products: await prisma.product.count().catch(() => 0),
    };

    // Remove knowledgeBase if model doesn't exist
    // knowledgeBase: await prisma.knowledgeBase.count().catch(() => 0),

    // Get sample data (with error handling)
    const samples = {
      agents: await prisma.agent.findMany({ take: 5, select: { id: true, name: true, email: true } }).catch(() => []),
      customers: await prisma.customer.findMany({ take: 5, select: { id: true, name: true, email: true } }).catch(() => []),
      conversations: await prisma.conversation.findMany({ take: 5, select: { ticketNumber: true, subject: true, status: true } }).catch(() => []),
      slaPolicies: await prisma.sLAPolicy.findMany({ take: 5, select: { id: true, name: true, isActive: true } }).catch(() => []),
    };

    return res.status(200).json({
      success: true,
      counts,
      samples,
      isEmpty: Object.values(counts).every(c => c === 0),
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        prismaAvailable: typeof prisma !== 'undefined',
        modelsAvailable: {
          agent: typeof prisma?.agent !== 'undefined',
          user: typeof prisma?.user !== 'undefined',
        }
      } : undefined,
    });
  }
  // NOTE: Do NOT disconnect Prisma here - it's a singleton shared across all requests
}

