import prisma, { ensurePrismaConnected } from '@/lib/prisma';


const VALID_PRESENCE_STATUSES = ['online', 'away', 'busy', 'offline', 'on_leave', 'in_meeting', 'dnd'];

export default async function handler(req, res) {
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const { presenceStatus } = req.body;

      if (!presenceStatus || !VALID_PRESENCE_STATUSES.includes(presenceStatus)) {
        return res.status(400).json({ 
          message: 'Invalid presence status. Must be one of: ' + VALID_PRESENCE_STATUSES.join(', ')
        });
      }

      // Try to find by slug first, then by id
      let agent = await prisma.agent.findUnique({
        where: { slug: id }
      });

      if (!agent) {
        agent = await prisma.agent.findUnique({
          where: { id }
        });
      }

      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      // Update presence status and lastSeenAt
      const updateData = {
        presenceStatus,
        updatedAt: new Date()
      };

      // Update lastSeenAt only when going online
      if (presenceStatus === 'online') {
        updateData.lastSeenAt = new Date();
      }

      const updatedAgent = await prisma.agent.update({
        where: { id: agent.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          slug: true,
          presenceStatus: true,
          lastSeenAt: true,
          updatedAt: true
        }
      });

      // Emit socket event for real-time updates
      // This will be handled by the socket server
      if (req.socket?.server?.io) {
        req.socket.server.io.emit('agent:presence:update', {
          agentId: updatedAgent.id,
          agentSlug: updatedAgent.slug,
          presenceStatus: updatedAgent.presenceStatus,
          lastSeenAt: updatedAgent.lastSeenAt,
          updatedAt: updatedAgent.updatedAt
        });
      }

      return res.status(200).json({ 
        success: true,
        agent: updatedAgent 
      });
    } catch (error) {
      console.error('Failed to update agent presence', error);
      return res.status(500).json({ 
        message: 'Failed to update agent presence', 
        error: error.message 
      });
    }
  }

  if (req.method === 'GET') {
    try {
      // Try to find by slug first, then by id
      let agent = await prisma.agent.findUnique({
        where: { slug: id },
        select: {
          id: true,
          name: true,
          email: true,
          slug: true,
          presenceStatus: true,
          lastSeenAt: true
        }
      });

      if (!agent) {
        agent = await prisma.agent.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            slug: true,
            presenceStatus: true,
            lastSeenAt: true
          }
        });
      }

      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      return res.status(200).json({ 
        success: true,
        agent 
      });
    } catch (error) {
      console.error('Failed to fetch agent presence', error);
      return res.status(500).json({ 
        message: 'Failed to fetch agent presence', 
        error: error.message 
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

