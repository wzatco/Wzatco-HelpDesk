import { PrismaClient } from '@prisma/client';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const userId = getCurrentUserId(req);
  
  if (req.method === 'GET') {
    // Check permission to view roles
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.roles', res);
      if (!hasAccess) return;
    }
    try {
      const roles = await prisma.role.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { agents: true }
          }
        }
      });

      res.status(200).json({ success: true, roles });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    // Check permission to create roles
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.roles', res);
      if (!hasAccess) return;
    }
    
    try {
      const { title, displayAs, hasSuperPower } = req.body;

      if (!title || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'Title is required' });
      }

      // Check if role with same title exists
      const existingRole = await prisma.role.findUnique({
        where: { title: title.trim() }
      });

      if (existingRole) {
        return res.status(400).json({ success: false, message: 'Role with this title already exists' });
      }

      const role = await prisma.role.create({
        data: {
          title: title.trim(),
          displayAs: displayAs?.trim() || null,
          hasSuperPower: hasSuperPower || false
        }
      });

      res.status(201).json({ success: true, role });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
}

