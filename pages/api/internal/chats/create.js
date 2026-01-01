import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';
import { getCurrentUserId, verifyToken } from '../../../../lib/auth';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

/**
 * POST /api/internal/chats/create
 * Create a new internal chat or return existing one between two users
 * Body: { targetUserId, targetUserType }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await ensurePrismaConnected();

  try {
    const { targetUserId, targetUserType } = req.body;

    if (!targetUserId || !targetUserType) {
      return res.status(400).json({ message: 'targetUserId and targetUserType are required' });
    }

    if (!['admin', 'agent'].includes(targetUserType)) {
      return res.status(400).json({ message: 'targetUserType must be "admin" or "agent"' });
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

    // Prevent self-chat
    if (currentUserId === targetUserId && currentUserType === targetUserType) {
      return res.status(400).json({ message: 'Cannot create chat with yourself' });
    }

    // Check if chat already exists (check both combinations)
    let existingChat = await prisma.internalChat.findFirst({
      where: {
        OR: [
          {
            participantOneId: currentUserId,
            participantOneType: currentUserType,
            participantTwoId: targetUserId,
            participantTwoType: targetUserType
          },
          {
            participantOneId: targetUserId,
            participantOneType: targetUserType,
            participantTwoId: currentUserId,
            participantTwoType: currentUserType
          }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // If chat exists, return it with full details
    if (existingChat) {
      // Get other participant details
      const isParticipantOne = existingChat.participantOneId === currentUserId && existingChat.participantOneType === currentUserType;
      const otherParticipantId = isParticipantOne ? existingChat.participantTwoId : existingChat.participantOneId;
      const otherParticipantType = isParticipantOne ? existingChat.participantTwoType : existingChat.participantOneType;
      
      let otherParticipant = null;
      if (otherParticipantType === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { id: otherParticipantId },
          select: { id: true, name: true, email: true, avatarUrl: true }
        });
        if (admin) {
          otherParticipant = {
            id: admin.id,
            type: 'admin',
            name: admin.name || 'Admin',
            email: admin.email,
            avatarUrl: admin.avatarUrl
          };
        }
      } else if (otherParticipantType === 'agent') {
        const agent = await prisma.agent.findUnique({
          where: { id: otherParticipantId },
          select: {
            id: true,
            name: true,
            email: true,
            account: {
              select: {
                avatarUrl: true
              }
            }
          }
        });
        if (agent) {
          otherParticipant = {
            id: agent.id,
            type: 'agent',
            name: agent.name || 'Agent',
            email: agent.email,
            avatarUrl: agent.account?.avatarUrl
          };
        }
      }
      
      return res.status(200).json({
        success: true,
        chat: {
          id: existingChat.id,
          lastMessageAt: existingChat.lastMessageAt,
          createdAt: existingChat.createdAt,
          otherParticipant: otherParticipant,
          lastMessage: existingChat.messages?.[0] || null
        },
        isNew: false
      });
    }

    // Create new chat
    // Normalize: Always put smaller ID first to ensure consistency
    const participants = [
      { id: currentUserId, type: currentUserType },
      { id: targetUserId, type: targetUserType }
    ].sort((a, b) => {
      // Sort by type first (admin < agent), then by id
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.id.localeCompare(b.id);
    });

    const newChat = await prisma.internalChat.create({
      data: {
        participantOneId: participants[0].id,
        participantOneType: participants[0].type,
        participantTwoId: participants[1].id,
        participantTwoType: participants[1].type,
        lastMessageAt: new Date()
      }
    });

    // Get other participant details (the target user)
    let otherParticipant = null;
    if (targetUserType === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true, avatarUrl: true }
      });
      if (admin) {
        otherParticipant = {
          id: admin.id,
          type: 'admin',
          name: admin.name || 'Admin',
          email: admin.email,
          avatarUrl: admin.avatarUrl
        };
      }
    } else if (targetUserType === 'agent') {
      const agent = await prisma.agent.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          name: true,
          email: true,
          account: {
            select: {
              avatarUrl: true
            }
          }
        }
      });
      if (agent) {
        otherParticipant = {
          id: agent.id,
          type: 'agent',
          name: agent.name || 'Agent',
          email: agent.email,
          avatarUrl: agent.account?.avatarUrl
        };
      }
    }

    return res.status(201).json({
      success: true,
      chat: {
        id: newChat.id,
        lastMessageAt: newChat.lastMessageAt,
        createdAt: newChat.createdAt,
        otherParticipant: otherParticipant,
        lastMessage: null
      },
      isNew: true
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

