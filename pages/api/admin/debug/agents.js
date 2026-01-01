// Debug endpoint to check what agent IDs/slugs/userIds are in the database
import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        slug: true,
        userId: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      success: true,
      total: agents.length,
      agents: agents.map(agent => ({
        id: agent.id,
        slug: agent.slug,
        userId: agent.userId,
        name: agent.name,
        email: agent.email,
        profileUrl: `/admin/agents/${agent.slug || agent.id}`
      }))
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

