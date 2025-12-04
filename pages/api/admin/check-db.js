import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const counts = {
      agents: await prisma.agent.count(),
      users: await prisma.user.count(),
      customers: await prisma.customer.count(),
      conversations: await prisma.conversation.count(),
      departments: await prisma.department.count(),
      roles: await prisma.role.count(),
      slaPolicies: await prisma.sLAPolicy.count(),
      slaWorkflows: await prisma.sLAWorkflow.count(),
      slaTimers: await prisma.sLATimer.count(),
      products: await prisma.product.count(),
      knowledgeBase: await prisma.knowledgeBase.count(),
    };

    // Get sample data
    const samples = {
      agents: await prisma.agent.findMany({ take: 5, select: { id: true, name: true, email: true } }),
      customers: await prisma.customer.findMany({ take: 5, select: { id: true, name: true, email: true } }),
      conversations: await prisma.conversation.findMany({ take: 5, select: { id: true, subject: true, status: true } }),
      slaPolicies: await prisma.sLAPolicy.findMany({ take: 5, select: { id: true, name: true, isActive: true } }),
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}

