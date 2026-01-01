import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const agentId = await getCurrentAgentId(req);

    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agent's accountId for userId checks
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { accountId: true },
    });

    if (!agent || !agent.accountId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // POST - Mark notification as read (for /[id]/mark-read API route compatibility)
    if (req.method === 'POST') {
      const notification = await prisma.notification.updateMany({
        where: {
          id: id,
          userId: agent.accountId,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      if (notification.count === 0) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    }

    // PATCH - Mark notification as read (alternative method)
    if (req.method === 'PATCH') {
      const { read } = req.body;

      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (notification.userId !== agent.accountId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: {
          read: read ?? true,
          readAt: read !== false ? new Date() : null
        }
      });

      return res.status(200).json({
        success: true,
        notification: {
          id: updated.id,
          read: updated.read,
          readAt: updated.readAt
        }
      });
    }

    // DELETE - Delete notification
    if (req.method === 'DELETE') {
      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (notification.userId !== agent.accountId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.notification.delete({
        where: { id }
      });

      return res.status(200).json({
        success: true,
        message: 'Notification deleted'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling notification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
