// Widget API - Send message to ticket
import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {

      await ensurePrismaConnected();
      const { id } = req.query;
      const { content, email } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Find customer by email
      const customer = await prisma.customer.findFirst({
        where: { email: email.toLowerCase() }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Verify ticket belongs to customer
      const ticket = await prisma.conversation.findFirst({
        where: {
          id: id,
          customerId: customer.id
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found or access denied'
        });
      }

      // Check if ticket is closed or resolved
      if (ticket.status === 'closed' || ticket.status === 'resolved') {
        return res.status(400).json({
          success: false,
          message: 'Cannot send messages to closed or resolved tickets'
        });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: id,
          senderId: customer.id,
          senderType: 'customer',
          content: content.trim(),
          type: 'text'
        }
      });

      // Trigger webhook for message creation
      try {
        const { triggerWebhook } = await import('../../../../../lib/utils/webhooks');
        await triggerWebhook('message.created', {
          message: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderType: message.senderType,
            type: message.type,
            createdAt: message.createdAt
          },
          ticket: {
            ticketNumber: ticket.ticketNumber || id,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority
          },
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          }
        });
      } catch (webhookError) {
        console.error('Error triggering message.created webhook:', webhookError);
        // Don't fail message creation if webhook fails
      }

      // Update ticket's lastMessageAt
      await prisma.conversation.update({
        where: { id: id },
        data: { lastMessageAt: new Date() }
      });

      // Emit socket event for real-time updates (if socket.io is available)
      try {
        if (req.socket?.server?.io) {
          const roomName = `ticket_${id}`;
          const messageData = {
            id: message.id,
            conversationId: id,
            senderId: customer.id,
            senderType: 'customer',
            senderName: ticket.customer?.name || customer.name || 'Customer',
            content: message.content,
            createdAt: message.createdAt,
            attachments: []
          };
          
          console.log(`📤 API: Broadcasting customer ticket message to ${roomName}:`, messageData);
          req.socket.server.io.to(roomName).emit('ticket:new_message', messageData);
        }
      } catch (socketError) {
        console.error('Error emitting socket event:', socketError);
        // Don't fail the request if socket emission fails
      }

      res.status(200).json({
        success: true,
        message: {
          id: message.id,
          content: message.content,
          senderType: message.senderType,
          createdAt: message.createdAt
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending message'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

