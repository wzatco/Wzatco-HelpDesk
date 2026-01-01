import prisma from '@/lib/prisma';


export default async function handler(req, res) {
    if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { agentIds, updateData } = req.body;

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({ message: 'Agent IDs array is required' });
    }

    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({ message: 'Update data is required' });
    }

    // Build update data object (only include valid fields)
    const validUpdateData = {};
    
    if (updateData.isActive !== undefined) {
      validUpdateData.isActive = Boolean(updateData.isActive);
    }

    if (updateData.roleId !== undefined) {
      if (updateData.roleId === null || updateData.roleId === '') {
        validUpdateData.roleId = null;
      } else {
        // Validate role exists
        const role = await prisma.role.findUnique({
          where: { id: updateData.roleId }
        });
        if (!role) {
          return res.status(400).json({ message: 'Invalid role ID' });
        }
        validUpdateData.roleId = updateData.roleId;
      }
    }

    if (updateData.maxLoad !== undefined) {
      validUpdateData.maxLoad = updateData.maxLoad ? parseInt(updateData.maxLoad) : null;
    }

    if (Object.keys(validUpdateData).length === 0) {
      return res.status(400).json({ message: 'No valid update fields provided' });
    }

    // Update all agents
    const result = await prisma.agent.updateMany({
      where: {
        id: { in: agentIds }
      },
      data: validUpdateData
    });

    // Fetch updated agents
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
        },
        role: {
          select: {
            id: true,
            title: true,
            displayAs: true
          }
        }
      }
    });

    return res.status(200).json({
      message: `Successfully updated ${result.count} agent(s)`,
      count: result.count,
      agents: updatedAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        departmentId: agent.departmentId,
        roleId: agent.roleId,
        isActive: agent.isActive,
        maxLoad: agent.maxLoad,
        department: agent.department,
        role: agent.role
      }))
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    return res.status(500).json({ 
      message: 'Failed to update agents', 
      error: error.message 
    });
  } 
}

