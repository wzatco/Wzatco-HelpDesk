import prisma from '../../../../../lib/prisma';
import { getCurrentUserId, verifyToken } from '../../../../../lib/auth';
import { getCurrentAgentId } from '../../../../../lib/utils/agent-auth';

/**
 * GET /api/internal/chats/[id]/messages
 * Fetch all messages for a chat
 * 
 * POST /api/internal/chats/[id]/messages
 * Send a new message in a chat
 */
export default async function handler(req, res) {
  const { id: chatId } = req.query;

  if (!chatId) {
    return res.status(400).json({ message: 'Chat ID is required' });
  }

  // Identify current user (Admin or Agent)
  const adminUserId = getCurrentUserId(req);
  const agentId = await getCurrentAgentId(req);

  let currentUserId = null;
  let currentUserType = null;

  // Check if user is an Admin
  if (adminUserId) {
    // Try to get adminId from token first
    const decoded = verifyToken(req);
    
    if (decoded?.adminId) {
      // Use adminId directly from token
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId },
        select: { id: true, name: true }
      });
      if (admin) {
        currentUserId = admin.id;
        currentUserType = 'admin';
        req.currentUserName = admin.name || 'Admin';
      }
    } else {
      // Fallback: Look up Admin by User email
      const user = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { email: true }
      });
      
      if (user?.email) {
        const admin = await prisma.admin.findUnique({
          where: { email: user.email },
          select: { id: true, name: true }
        });
        if (admin) {
          currentUserId = admin.id;
          currentUserType = 'admin';
          req.currentUserName = admin.name || 'Admin';
        }
      }
    }
  }

  // If not admin, check if user is an Agent
  if (!currentUserId && agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true }
    });
    if (agent) {
      currentUserId = agent.id;
      currentUserType = 'agent';
      req.currentUserName = agent.name;
    }
  }

  if (!currentUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Verify user is a participant in this chat
      const chat = await prisma.internalChat.findUnique({
        where: { id: chatId },
        select: {
          id: true,
          participantOneId: true,
          participantOneType: true,
          participantTwoId: true,
          participantTwoType: true
        }
      });

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      // Security check: Verify user is a participant
      const isParticipant = 
        (chat.participantOneId === currentUserId && chat.participantOneType === currentUserType) ||
        (chat.participantTwoId === currentUserId && chat.participantTwoType === currentUserType);

      if (!isParticipant) {
        return res.status(403).json({ message: 'Forbidden: You are not a participant in this chat' });
      }

      // Fetch all messages
      const messages = await prisma.internalMessage.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          senderId: true,
          senderType: true,
          content: true,
          metadata: true,
          read: true,
          readAt: true,
          createdAt: true
        }
      });

      return res.status(200).json({
        success: true,
        messages
      });

    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { content, attachments } = req.body;

      // Validate: Either content or attachments must be present
      const hasContent = content && content.trim();
      const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;

      if (!hasContent && !hasAttachments) {
        return res.status(400).json({ message: 'Message content or attachments are required' });
      }

      // Validate attachments format if provided
      if (hasAttachments) {
        for (const attachment of attachments) {
          if (!attachment.url || !attachment.type) {
            return res.status(400).json({ message: 'Each attachment must have url and type' });
          }
        }
      }

      // Verify user is a participant in this chat
      const chat = await prisma.internalChat.findUnique({
        where: { id: chatId },
        select: {
          id: true,
          participantOneId: true,
          participantOneType: true,
          participantTwoId: true,
          participantTwoType: true
        }
      });

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      // Security check: Verify user is a participant
      const isParticipant = 
        (chat.participantOneId === currentUserId && chat.participantOneType === currentUserType) ||
        (chat.participantTwoId === currentUserId && chat.participantTwoType === currentUserType);

      if (!isParticipant) {
        return res.status(403).json({ message: 'Forbidden: You are not a participant in this chat' });
      }

      // Prepare metadata for attachments
      let metadata = null;
      if (hasAttachments) {
        metadata = {
          attachments: attachments.map(att => ({
            url: att.url,
            type: att.type,
            name: att.name || att.fileName || 'attachment',
            size: att.size || null
          }))
        };
      }

      // Create message
      const message = await prisma.internalMessage.create({
        data: {
          chatId,
          senderId: currentUserId,
          senderType: currentUserType,
          content: hasContent ? content.trim() : '',
          read: false,
          metadata: metadata || undefined
        }
      });

      // Update chat's lastMessageAt
      await prisma.internalChat.update({
        where: { id: chatId },
        data: { lastMessageAt: new Date() }
      });

      // Identify recipient for notification
      const recipientId = chat.participantOneId === currentUserId 
        ? chat.participantTwoId 
        : chat.participantOneId;
      const recipientType = chat.participantOneId === currentUserId 
        ? chat.participantTwoType 
        : chat.participantOneType;

      // Create notification for recipient
      if (recipientId && recipientType) {
        try {
          const senderName = req.currentUserName || (currentUserType === 'admin' ? 'Admin' : 'Agent');
          const messagePreview = hasContent 
            ? (content.trim().length > 100 ? content.trim().substring(0, 100) + '...' : content.trim())
            : (hasAttachments ? 'Sent an attachment' : 'Sent a message');
          
          const notification = await prisma.notification.create({
            data: {
              userId: recipientId, // Works for both admin and agent
              type: 'message',
              title: 'New Message',
              message: `${senderName}: ${messagePreview}`,
              link: `/${recipientType}/chat?chatId=${chatId}`,
              read: false,
              metadata: JSON.stringify({
                chatId: chatId,
                messageId: message.id,
                senderId: currentUserId,
                senderType: currentUserType,
                senderName: senderName
              })
            }
          });
        } catch (notificationError) {
          // Don't fail message creation if notification fails
        }
      }

      // Emit Socket.IO event for real-time updates
      const io = req.socket?.server?.io || global.io;
      if (io) {
        const senderName = req.currentUserName || (currentUserType === 'admin' ? 'Admin' : 'Agent');
        const messagePreview = hasContent 
          ? (content.trim().length > 100 ? content.trim().substring(0, 100) + '...' : content.trim())
          : (hasAttachments ? 'Sent an attachment' : 'Sent a message');
        
        const messageData = {
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          senderType: message.senderType,
          senderName: senderName,
          content: message.content,
          read: message.read,
          createdAt: message.createdAt,
          metadata: message.metadata || null
        };

        // Emit to chat room (primary method - both participants should be in this room)
        const chatRoom = `internal:chat:${chatId}`;
        io.to(chatRoom).emit('internal:message:new', messageData);
        
        // Also emit to both participants' personal rooms for notifications (fallback)
        const otherParticipantId = chat.participantOneId === currentUserId 
          ? chat.participantTwoId 
          : chat.participantOneId;
        const otherParticipantType = chat.participantOneId === currentUserId 
          ? chat.participantTwoType 
          : chat.participantOneType;

        // Emit to other participant's personal room (backup notification)
        if (otherParticipantType === 'agent') {
          io.to(`agent_${otherParticipantId}`).emit('internal:message:new', messageData);
          io.to(`agent_${otherParticipantId}`).emit('notification:new', {
            id: `temp_${Date.now()}`,
            type: 'message',
            title: 'New Message',
            message: `${senderName}: ${messagePreview}`,
            link: `/agent/chat?chatId=${chatId}`,
            chatId: chatId,
            senderName: senderName
          });
        } else if (otherParticipantType === 'admin') {
          io.to(`admin_${otherParticipantId}`).emit('internal:message:new', messageData);
          io.to(`admin_${otherParticipantId}`).emit('notification:new', {
            id: `temp_${Date.now()}`,
            type: 'message',
            title: 'New Message',
            message: `${senderName}: ${messagePreview}`,
            link: `/admin/chat?chatId=${chatId}`,
            chatId: chatId,
            senderName: senderName
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: {
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          senderType: message.senderType,
          content: message.content,
          read: message.read,
          createdAt: message.createdAt,
          metadata: message.metadata || null
        }
      });

    } catch (error) {
      return res.status(500).json({
        message: 'Internal server error',
        error: error.message
      });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

