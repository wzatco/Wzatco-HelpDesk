import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';
import { getCurrentUserId, verifyToken } from '../../../../lib/auth';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

/**
 * GET /api/internal/contacts
 * Fetch all system users (Admins & Agents) for starting new chats
 * Excludes the current user
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await ensurePrismaConnected();

  try {
    // Identify current user (Admin or Agent)
    const adminUserId = getCurrentUserId(req);
    const agentId = await getCurrentAgentId(req);

    let currentUserId = null;
    let currentUserType = null;

    // Check if user is an Admin
    if (adminUserId) {
      const decoded = verifyToken(req);
      
      if (decoded?.adminId) {
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

    // Fetch all Admins
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      },
      orderBy: { name: 'asc' }
    });

    // Fetch all Agents
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        accountId: true,
        account: {
          select: {
            avatarUrl: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Format and combine contacts
    const contacts = [
      ...admins.map(admin => ({
        id: admin.id,
        name: admin.name || 'Admin',
        type: 'admin',
        avatar: admin.avatarUrl || null,
        email: admin.email
      })),
      ...agents.map(agent => ({
        id: agent.id,
        name: agent.name || 'Agent',
        type: 'agent',
        avatar: agent.account?.avatarUrl || null,
        email: agent.email
      }))
    ];

    // Filter out current user
    const filteredContacts = contacts.filter(
      contact => !(contact.id === currentUserId && contact.type === currentUserType)
    );

    // Sort alphabetically by name
    filteredContacts.sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });

    return res.status(200).json({
      success: true,
      contacts: filteredContacts
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

