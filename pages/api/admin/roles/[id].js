import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: { agents: true, permissions: true }
          }
        }
      });

      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      res.status(200).json({ success: true, role });
    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { title, displayAs, hasSuperPower } = req.body;

      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id }
      });

      if (!existingRole) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      // Check if title is being changed and if new title already exists
      if (title && title.trim() !== existingRole.title) {
        const titleExists = await prisma.role.findUnique({
          where: { title: title.trim() }
        });

        if (titleExists) {
          return res.status(400).json({ success: false, message: 'Role with this title already exists' });
        }
      }

      const role = await prisma.role.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(displayAs !== undefined && { displayAs: displayAs?.trim() || null }),
          ...(hasSuperPower !== undefined && { hasSuperPower })
        }
      });

      res.status(200).json({ success: true, role });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: { agents: true }
          }
        }
      });

      if (!existingRole) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      // Check if role is assigned to any agents
      if (existingRole._count.agents > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot delete role. It is assigned to ${existingRole._count.agents} agent(s).` 
        });
      }

      await prisma.role.delete({
        where: { id }
      });

      res.status(200).json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
}

