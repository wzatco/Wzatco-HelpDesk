import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';


export default async function handler(req, res) {
    const userId = getCurrentUserId(req);

  if (req.method === 'GET') {
    // Check permission to view users
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.users', res);
      if (!hasAccess) return;
    }
    try {
      // Try to fetch users with agent relation, fall back without it if accountId column doesn't exist
      let users;
      
      try {
        users = await prisma.user.findMany({
          include: {
            role: {
              select: {
                id: true,
                title: true,
                displayAs: true,
                hasSuperPower: true
              }
            },
            agent: {
              select: {
                id: true,
                slug: true,
                department: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true
                  }
                },
                isActive: true,
                presenceStatus: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } catch (agentError) {
        // If accountId column doesn't exist, fetch without agent relation
        if (agentError.message && agentError.message.includes('accountId')) {
          console.warn('Warning: accountId column not found, fetching users without agent relation');
          
          users = await prisma.user.findMany({
            include: {
              role: {
                select: {
                  id: true,
                  title: true,
                  displayAs: true,
                  hasSuperPower: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          });
        } else {
          throw agentError;
        }
      }

      return res.status(200).json({
        users
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        message: 'Failed to fetch users',
        error: error.message
      });
    } 
  }

  if (req.method === 'PATCH') {
    // Check permission to manage users
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.users', res);
      if (!hasAccess) return;
    }
    
    try {
      const { userId: targetUserId, roleId, status, type } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Try to update with agent relation, fall back without it if accountId column doesn't exist
      let user;
      
      try {
        user = await prisma.user.update({
          where: { id: targetUserId },
          data: {
            roleId: roleId === undefined ? undefined : roleId || null,
            status: status || undefined,
            type: type || undefined
          },
          include: {
            role: {
              select: {
                id: true,
                title: true,
                displayAs: true,
                hasSuperPower: true
              }
            },
            agent: {
              select: {
                id: true,
                slug: true,
                department: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true
                  }
                },
                isActive: true
              }
            }
          }
        });
      } catch (agentError) {
        // If accountId column doesn't exist, update without agent relation
        if (agentError.message && agentError.message.includes('accountId')) {
          console.warn('Warning: accountId column not found, updating user without agent relation');
          
          user = await prisma.user.update({
            where: { id: targetUserId },
            data: {
              roleId: roleId === undefined ? undefined : roleId || null,
              status: status || undefined,
              type: type || undefined
            },
            include: {
              role: {
                select: {
                  id: true,
                  title: true,
                  displayAs: true,
                  hasSuperPower: true
                }
              }
            }
          });
        } else {
          throw agentError;
        }
      }

      return res.status(200).json({
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(500).json({
        message: 'Failed to update user',
        error: error.message
      });
    } 
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

