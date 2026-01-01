import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        agent: {
          include: {
            department: true
          }
        }
      }
    });

    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        accountId: true
      }
    });

    return res.status(200).json({
      success: true,
      userCount: users.length,
      agentCount: agents.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        type: u.type,
        hasAgent: !!u.agent,
        agentSlug: u.agent?.slug
      })),
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        accountId: a.accountId,
        hasAccount: !!a.accountId
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  } finally {
    await prisma.$disconnect();
  }
}

