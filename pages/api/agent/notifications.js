import prisma from '../../../lib/prisma';
import { getCurrentAgentId } from '../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  try {
    const agentId = await getCurrentAgentId(req);

    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }



    // GET - Fetch notifications for the agent
    if (req.method === 'GET') {
      // Get the agent record to find accountId (User ID)
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { accountId: true }
      });

      if (!agent || !agent.accountId) {
        return res.status(200).json({
          success: true,
          notifications: []
        });
      }

      const notifications = await prisma.notification.findMany({
        where: {
          userId: agent.accountId // Use accountId which is the User ID
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Limit to 50 most recent notifications
      });

      // Format notifications for frontend
      const formattedNotifications = notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.message,
        link: n.link,
        read: n.read,
        time: n.createdAt.toISOString(),
        metadata: n.metadata ? JSON.parse(n.metadata) : null
      }));

      return res.status(200).json({
        success: true,
        notifications: formattedNotifications
      });
    }

    // POST - Create a new notification
    if (req.method === 'POST') {
      const { type, title, body, link, metadata } = req.body;

      if (!type || !title || !body) {
        return res.status(400).json({
          error: 'Missing required fields: type, title, body'
        });
      }

      const notification = await prisma.notification.create({
        data: {
          userId: agentId,
          type,
          title,
          message: body,
          link: link || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          read: false
        }
      });

      return res.status(201).json({
        success: true,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.message,
          link: notification.link,
          read: notification.read,
          time: notification.createdAt.toISOString(),
          metadata: notification.metadata ? JSON.parse(notification.metadata) : null
        }
      });
    }

    // DELETE - Delete a notification
    if (req.method === 'DELETE') {
      const { notificationId } = req.query;

      if (!notificationId) {
        return res.status(400).json({
          error: 'Notification ID required'
        });
      }

      // Get agent's accountId
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { accountId: true },
      });

      if (!agent || !agent.accountId) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Delete notification only if it belongs to this agent
      const deleted = await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: agent.accountId,
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

