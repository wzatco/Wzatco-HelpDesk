// API endpoint for fetching system users (Admins and Agents)
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

export default async function handler(req, res) {
  const userId = getCurrentUserId(req);

  if (req.method === 'GET') {
    try {
      // Check permission
      if (userId) {
        const hasAccess = await checkPermissionOrFail(userId, 'admin.users', res);
        if (!hasAccess) return;
      }

      // Fetch Admins
      const admins = await prisma.admin.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Fetch Agents with their account info
      const agents = await prisma.agent.findMany({
        select: {
          id: true,
          slug: true,
          userId: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true
            }
          },
          role: {
            select: {
              id: true,
              title: true,
              displayAs: true
            }
          },
          account: {
            select: {
              id: true,
              email: true,
              status: true,
              type: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Format agents
      const formattedAgents = agents.map(agent => {
        console.log('📋 System Users API: Agent data:', { 
          id: agent.id, 
          slug: agent.slug, 
          name: agent.name,
          userId: agent.userId || 'N/A'
        });
        return {
          id: agent.id,
          slug: agent.slug,
          userId: agent.userId,
          name: agent.name,
          email: agent.email,
          phone: null,
          role: agent.role?.title || 'Agent',
          avatarUrl: null,
          department: agent.department?.name || null,
          isActive: agent.isActive,
          type: 'agent',
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt
        };
      });

      // Format admins
      const formattedAdmins = admins.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role || 'Admin',
        avatarUrl: admin.avatarUrl,
        department: null,
        isActive: true,
        type: 'admin',
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }));

      return res.status(200).json({
        success: true,
        admins: formattedAdmins,
        agents: formattedAgents,
        total: formattedAdmins.length + formattedAgents.length
      });
    } catch (error) {
      console.error('Error fetching system users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch system users',
        error: error.message
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

