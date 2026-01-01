import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { agentIds, departmentId } = req.body;

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({ message: 'Agent IDs array is required' });
    }

    // Validate department if provided (null is allowed to unassign)
    if (departmentId !== null && departmentId !== undefined && departmentId !== '') {
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      });
      if (!department) {
        return res.status(400).json({ message: 'Invalid department ID' });
      }
    }

    // Update all agents
    const updateData = {
      departmentId: departmentId || null
    };

    const result = await prisma.agent.updateMany({
      where: {
        id: { in: agentIds }
      },
      data: updateData
    });

    // Fetch updated agents with department info
    const updatedAgents = await prisma.agent.findMany({
      where: {
        id: { in: agentIds }
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    return res.status(200).json({
      message: `Successfully assigned ${result.count} agent(s)`,
      count: result.count,
      agents: updatedAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        departmentId: agent.departmentId,
        department: agent.department
      }))
    });
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    return res.status(500).json({ 
      message: 'Failed to assign agents', 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

