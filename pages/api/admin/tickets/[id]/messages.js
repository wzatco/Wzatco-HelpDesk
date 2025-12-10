import { PrismaClient } from '@prisma/client';
import { updateTATMetrics } from '@/lib/utils/tat';
import { parseMentions, findUserByMention } from '@/lib/utils/mentions';
import { notifyMention, notifyCustomerMessage, notifyFirstResponseCustomer } from '@/lib/utils/notifications';
import { getTicketSettings } from '@/lib/settings';

// Get Socket.IO instance from server
let ioInstance = null;
export function setSocketIO(io) {
  ioInstance = io;
}

// Helper to get Socket.IO instance
function getSocketIO() {
  // Socket.IO instance should be set via setSocketIO() from server.js
  // This function is kept for compatibility but the instance must be set externally
  return ioInstance;
}

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const { content, senderType = 'agent', attachments = [], replyToId = null } = req.body;

      // Derive sender type from headers if provided (preferred), fallback to body
      const headerRole = (req.headers['x-user-role'] || req.headers['x-role'] || '').toString().toLowerCase();
      const resolvedSender = headerRole === 'admin' ? 'admin' : headerRole === 'customer' ? 'customer' : senderType;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      // Get ticket settings to check anyStaffCanReply
      const ticketSettings = await getTicketSettings();
      
      // Get conversation to check assignee
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: { assigneeId: true }
      });

      if (!conversation) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Check if anyStaffCanReply is enabled
      // If disabled, only assigned agent can reply (for now, we allow admin replies)
      // TODO: In production, check if current user is the assigned agent
      if (!ticketSettings.anyStaffCanReply && conversation.assigneeId) {
        // This would need actual user authentication to check
        // For now, we'll allow if senderType is 'admin' (admin override)
        if (resolvedSender !== 'admin') {
          // In production, check if current user is the assigned agent
          // return res.status(403).json({ message: 'Only the assigned agent can reply to this ticket' });
        }
      }

      // Get the correct senderId based on senderType
      let actualSenderId = null;
      if (resolvedSender === 'admin') {
        // Get admin profile (using default email for now, in production use authenticated user)
        const admin = await prisma.admin.findFirst({
          where: { email: 'admin@wzatco.com' }
        });
        if (admin) {
          actualSenderId = admin.id;
        }
      } else if (resolvedSender === 'agent') {
        // Use assignee ID if available, otherwise default
        actualSenderId = conversation.assigneeId || 'agent-001';
      }

      // Create new message
      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: actualSenderId,
          senderType: resolvedSender,
          conversationId: id,
          type: 'text',
          metadata: replyToId ? { replyTo: replyToId } : undefined
        },
        include: {
          attachments: true
        }
      });

      // Handle attachments if provided (base64 encoded files)
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets', id);
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        for (const attachment of attachments) {
          if (attachment.base64 && attachment.filename && attachment.mimeType) {
            try {
              const base64Data = attachment.base64.split(',')[1] || attachment.base64;
              const buffer = Buffer.from(base64Data, 'base64');
              const filename = `${Date.now()}_${attachment.filename}`;
              const filePath = path.join(uploadsDir, filename);
              
              fs.writeFileSync(filePath, buffer);
              const fileUrl = `/api/uploads/tickets/${id}/${filename}`;

              await prisma.attachment.create({
                data: {
                  messageId: message.id,
                  url: fileUrl,
                  filename: attachment.filename,
                  mimeType: attachment.mimeType,
                  size: buffer.length
                }
              });
            } catch (err) {
              console.error('Error saving attachment:', err);
              // Continue even if attachment fails
            }
          }
        }
      }

      // Update conversation's lastMessageAt
      await prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: new Date()
        }
      });

      // Update TAT metrics if this is an agent/admin response (for first response time tracking)
      if (resolvedSender === 'agent' || resolvedSender === 'admin') {
        try {
          // Check if this is the first response before updating TAT
          const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: { customer: true }
          });

          const isFirstResponse = !conversation?.firstResponseAt && conversation?.firstResponseTimeSeconds === null;

          await updateTATMetrics(prisma, id);

          // Send first response email to customer if this is the first response
          if (isFirstResponse && conversation?.customer?.email) {
            try {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              const ticketLink = `${baseUrl}/ticket/${id}`;
              
              // Get sender name
              let senderName = 'Admin';
              try {
                if (resolvedSender === 'agent') {
                  const agent = await prisma.agent.findFirst({
                    where: { id: message.senderId },
                    select: { name: true }
                  });
                  if (agent) senderName = agent.name;
                } else if (resolvedSender === 'admin') {
                  const admin = await prisma.admin.findFirst({
                    where: { email: 'admin@wzatco.com' },
                    select: { name: true }
                  });
                  if (admin) senderName = admin.name;
                }
              } catch (err) {
                console.error('Error fetching sender name:', err);
              }

              await notifyFirstResponseCustomer(prisma, {
                ticketId: id,
                ticketSubject: conversation.subject || 'No subject',
                customerEmail: conversation.customer.email,
                customerName: conversation.customer.name || 'Customer',
                agentName: senderName,
                messageContent: content,
                ticketLink,
                sendEmail: true
              });
            } catch (firstResponseError) {
              console.error('Error sending first response email to customer:', firstResponseError);
              // Don't fail the request if email fails
            }
          }
        } catch (tatError) {
          console.error('Error updating TAT metrics:', tatError);
          // Don't fail the request if TAT update fails
        }
      } else if (resolvedSender === 'customer') {
        // Customer sent a message - notify assigned agent if not active
        // Note: We can't check socket state from API, so we'll always send email
        // The socket handler will check activity and skip if agent is active
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: { 
              customer: true,
              assignee: true
            }
          });

          if (conversation && conversation.assignee && conversation.assignee.email) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const ticketLink = `${baseUrl}/admin/tickets/${id}`;
            
            notifyCustomerMessageAgent(prisma, {
              ticketId: id,
              ticketSubject: conversation.subject || 'No subject',
              agentEmail: conversation.assignee.email,
              agentName: conversation.assignee.name || 'Agent',
              customerName: conversation.customer?.name || 'Customer',
              customerEmail: conversation.customer?.email,
              messageContent: content,
              ticketLink,
              sendEmail: true
            }).catch(error => {
              console.error('Error sending customer message email to agent:', error);
            });
          }
        } catch (error) {
          console.error('Error checking agent for customer message notification:', error);
          // Don't fail the request if notification fails
        }
      }

      // Parse and handle @mentions in messages (for admin/agent messages only)
      if ((resolvedSender === 'agent' || resolvedSender === 'admin') && content) {
        const conversation = await prisma.conversation.findUnique({
          where: { id },
          include: { customer: true }
        }).catch(() => null);

        if (conversation) {
          // Get sender name for notifications
          let senderName = 'Admin';
          try {
            if (resolvedSender === 'agent') {
              const agent = await prisma.agent.findFirst({
                where: { id: message.senderId },
                select: { name: true }
              });
              if (agent) senderName = agent.name;
            } else if (resolvedSender === 'admin') {
              const admin = await prisma.admin.findFirst({
                where: { email: 'admin@wzatco.com' },
                select: { name: true }
              });
              if (admin) senderName = admin.name;
            }
          } catch (err) {
            console.error('Error fetching sender name:', err);
          }

          // Check if customer is active (via socket) and send email if not
          // Note: We can't directly check socket state from API, so we'll send email
          // The socket handler will check activity and skip if customer is active
          if (conversation.customer && conversation.customer.email) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const ticketLink = `${baseUrl}/ticket/${id}`;
            
            // Send email notification to customer (socket will check if customer is active)
            notifyCustomerMessage(prisma, {
              ticketId: conversation.id,
              ticketSubject: conversation.subject,
              customerEmail: conversation.customer.email,
              customerName: conversation.customer.name || 'Customer',
              messageContent: content,
              senderName: senderName,
              ticketLink,
              sendEmail: true
            }).catch(error => {
              console.error('Error sending customer email notification:', error);
            });
          }

          // Handle @mentions
          const mentions = parseMentions(content);
          if (mentions.length > 0) {
            // Process mentions asynchronously (don't block the response)
            Promise.all(
              mentions.map(async (mention) => {
                const user = await findUserByMention(prisma, mention.mentionText);
                if (user && user.id !== message.senderId) {
                  // Send mention notification
                  await notifyMention(prisma, {
                    ticketId: conversation.id,
                    ticketSubject: conversation.subject,
                    mentionedUserId: user.id,
                    mentionedUserName: user.name,
                    mentionedBy: senderName,
                    commentId: message.id,
                    commentPreview: content.slice(0, 100),
                    commentContent: content
                  });
                }
              })
            ).catch(error => {
              console.error('Error processing mentions in message:', error);
            });
          }
        }
      }

      // Fetch the complete message with attachments for response
      const fullMessage = await prisma.message.findUnique({
        where: { id: message.id },
        include: {
          attachments: true
        }
      });

      // Fetch sender information
      let senderName = null;
      let senderAvatar = null;
      
      if (resolvedSender === 'admin' && message.senderId) {
        try {
          const admin = await prisma.admin.findUnique({
            where: { id: message.senderId },
            select: { name: true, avatarUrl: true }
          });
          if (admin) {
            senderName = admin.name;
            senderAvatar = admin.avatarUrl;
          }
        } catch (error) {
          console.error('Error fetching admin sender:', error);
        }
      } else if (resolvedSender === 'agent' && message.senderId) {
        try {
          const agent = await prisma.agent.findUnique({
            where: { id: message.senderId },
            select: { name: true }
          });
          if (agent) {
            senderName = agent.name;
          }
        } catch (error) {
          console.error('Error fetching agent sender:', error);
        }
      }

      // Transform message to match frontend format
      const transformedMessage = {
        id: fullMessage.id,
        content: fullMessage.content,
        senderType: fullMessage.senderType,
        senderId: fullMessage.senderId,
        senderName: senderName,
        senderAvatar: senderAvatar,
        createdAt: fullMessage.createdAt,
        attachments: fullMessage.attachments || [],
        metadata: fullMessage.metadata
      };

      res.status(201).json({
        message: 'Message sent successfully',
        data: transformedMessage
      });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }

  await prisma.$disconnect();
}
