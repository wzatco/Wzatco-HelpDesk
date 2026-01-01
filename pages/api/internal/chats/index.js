import prisma from '../../../../lib/prisma';
import { getCurrentUserId, verifyToken } from '../../../../lib/auth';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

/**
 * GET /api/internal/chats
 * Fetch all internal chats for the current user (Admin or Agent)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

    try {
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
        currentUserId = decoded.adminId;
        currentUserType = 'admin';
      } else {
        // Fallback: Look up Admin by User email
        const user = await prisma.user.findUnique({
          where: { id: adminUserId },
          select: { email: true }
        });
        
        if (user?.email) {
          const admin = await prisma.admin.findUnique({
            where: { email: user.email },
            select: { id: true }
          });
          if (admin) {
            currentUserId = admin.id;
            currentUserType = 'admin';
          }
        }
      }
    }

    // If not admin, check if user is an Agent
    if (!currentUserId && agentId) {
      currentUserId = agentId;
      currentUserType = 'agent';
    }

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find all chats where current user is either participantOne or participantTwo
    const chats = await prisma.internalChat.findMany({
      where: {
        OR: [
          {
            participantOneId: currentUserId,
            participantOneType: currentUserType
          },
          {
            participantTwoId: currentUserId,
            participantTwoType: currentUserType
          }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest message for snippet
          select: {
            id: true,
            content: true,
            metadata: true,
            senderId: true,
            senderType: true,
            createdAt: true,
            read: true
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Enrich chats with participant information
    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      // Determine the other participant
      const isParticipantOne = chat.participantOneId === currentUserId && chat.participantOneType === currentUserType;
      const otherParticipantId = isParticipantOne ? chat.participantTwoId : chat.participantOneId;
      const otherParticipantType = isParticipantOne ? chat.participantTwoType : chat.participantOneType;

      // Fetch other participant's details
      let otherParticipant = null;
      if (otherParticipantType === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { id: otherParticipantId },
          select: { id: true, name: true, email: true }
        });
        if (admin) {
          otherParticipant = {
            id: admin.id,
            name: admin.name || 'Admin',
            email: admin.email,
            type: 'admin'
          };
        }
      } else if (otherParticipantType === 'agent') {
        const agent = await prisma.agent.findUnique({
          where: { id: otherParticipantId },
          select: { id: true, name: true, email: true }
        });
        if (agent) {
          otherParticipant = {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            type: 'agent'
          };
        }
      }

      // Count unread messages
      const unreadCount = await prisma.internalMessage.count({
        where: {
          chatId: chat.id,
          senderId: { not: currentUserId },
          read: false
        }
      });

      // Get participant names for compatibility
      let participantOneName = null;
      let participantTwoName = null;
      
      if (chat.participantOneType === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { id: chat.participantOneId },
          select: { name: true }
        });
        participantOneName = admin?.name || 'Admin';
      } else {
        const agent = await prisma.agent.findUnique({
          where: { id: chat.participantOneId },
          select: { name: true }
        });
        participantOneName = agent?.name || 'Agent';
      }
      
      if (chat.participantTwoType === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { id: chat.participantTwoId },
          select: { name: true }
        });
        participantTwoName = admin?.name || 'Admin';
      } else {
        const agent = await prisma.agent.findUnique({
          where: { id: chat.participantTwoId },
          select: { name: true }
        });
        participantTwoName = agent?.name || 'Agent';
      }

      return {
        id: chat.id,
        participantOneId: chat.participantOneId,
        participantOneType: chat.participantOneType,
        participantOneName,
        participantTwoId: chat.participantTwoId,
        participantTwoType: chat.participantTwoType,
        participantTwoName,
        otherParticipant,
        lastMessage: chat.messages[0] || null,
        lastMessageAt: chat.lastMessageAt,
        unreadCount,
        createdAt: chat.createdAt
      };
    }));

    return res.status(200).json({
      success: true,
      chats: enrichedChats
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

