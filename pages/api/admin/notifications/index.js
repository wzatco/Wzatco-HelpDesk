import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { userId = null, unreadOnly = false } = req.query;

      const where = {};
      if (userId) {
        where.userId = userId;
      } else {
        // For admin panel, get all notifications (userId is null for global admin)
        where.userId = null;
      }
      
      if (unreadOnly === 'true') {
        where.read = false;
      }

      // Get database notifications
      const dbNotifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Format database notifications for frontend
      const formattedDb = dbNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.message,
        time: n.createdAt,
        read: n.read,
        readAt: n.readAt,
        link: n.link,
        metadata: n.metadata ? JSON.parse(n.metadata) : null
      }));

      // Also get recent important ticket events and customer messages (for backward compatibility)
      // Only show important events, and customer messages only if no agent is active on ticket
      const recentConversations = await prisma.conversation.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: { 
          customer: true, 
          assignee: true,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1 // Get most recent activity
          },
          worklogs: {
            where: {
              endedAt: null // Active worklogs (agent is working on ticket)
            },
            take: 1
          }
        }
      }).catch(() => []);

      // Get recent customer messages (not agent/admin messages)
      const recentCustomerMessages = await prisma.message.findMany({
        where: {
          senderType: 'customer',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { 
          Conversation: {
            include: {
              worklogs: {
                where: {
                  endedAt: null // Active worklogs
                },
                take: 1
              }
            }
          }
        }
      }).catch(() => []);

      // Create activity notifications only for important events
      const activityNotifications = [];
      
      // Only add activity notifications if we have very few database notifications
      if (formattedDb.length < 5) {
        recentConversations.slice(0, 5).forEach((c) => {
          // Only show if there's a recent important activity (status change, assignment, etc.)
          const recentActivity = c.activities?.[0];
          if (recentActivity && ['status_changed', 'assigned', 'unassigned', 'priority_changed'].includes(recentActivity.activityType)) {
            activityNotifications.push({
              id: `conv_${c.id}_${recentActivity.id}`,
              type: 'conversation',
              title: `Ticket ${c.status === 'resolved' ? 'resolved' : 'updated'}: ${c.subject || c.id.slice(0,6)}`,
              body: `Customer: ${c.customer?.name || c.customerName || 'Unknown'} • Status: ${c.status}`,
              time: c.updatedAt,
              read: true, // Mark activity notifications as read by default
              readAt: null,
              link: `/admin/tickets/${c.id}`,
              metadata: { ticketId: c.id }
            });
          }
        });

        // Add customer messages only if no agent is actively working on the ticket
        recentCustomerMessages.forEach((m) => {
          const hasActiveWorklog = m.Conversation?.worklogs?.length > 0;
          
          // Only show customer message if no active worklog (agent not actively working)
          if (!hasActiveWorklog) {
            activityNotifications.push({
              id: `msg_${m.id}`,
              type: 'message',
              title: `New customer message on ticket: ${m.Conversation?.subject || m.conversationId.slice(0,6)}`,
              body: m.content?.slice(0, 140) || 'New message',
              time: m.createdAt,
              read: true, // Mark activity notifications as read by default
              readAt: null,
              link: `/admin/tickets/${m.conversationId}`,
              metadata: { ticketId: m.conversationId, messageId: m.id }
            });
          }
        });
      }

      // Combine database notifications with activity notifications
      // Database notifications first (newer system), then activity notifications
      const allNotifications = [...formattedDb, ...activityNotifications]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 50);

      res.status(200).json({ 
        notifications: allNotifications,
        unreadCount: allNotifications.filter(n => !n.read).length
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    // Create a new notification
    try {
      const { userId, type, title, message, link, metadata } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({ message: 'type, title, and message are required' });
      }

      const notification = await prisma.notification.create({
        data: {
          userId: userId || null,
          type,
          title,
          message,
          link: link || null,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });

      res.status(201).json({ notification });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}


