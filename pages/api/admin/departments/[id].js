import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';

export default async function handler(req, res) {
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { includeAgents = 'true', includeStats = 'true' } = req.query;

      const department = await prisma.department.findUnique({
        where: { id },
        include: includeAgents === 'true' ? {
          agents: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              maxLoad: true,
              skills: true
            }
          }
        } : undefined
      });

      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      // Parse JSON fields
      const parsedDepartment = {
        ...department,
        slaConfig: department.slaConfig ? JSON.parse(department.slaConfig) : null,
        workingHours: department.workingHours ? JSON.parse(department.workingHours) : null,
        holidays: department.holidays ? JSON.parse(department.holidays) : []
      };

      // Add stats if requested
      if (includeStats === 'true') {
        const ticketCounts = await prisma.conversation.groupBy({
          by: ['status'],
          where: { departmentId: id },
          _count: { ticketNumber: true }
        });

        const stats = {
          total: 0,
          open: 0,
          pending: 0,
          resolved: 0,
          closed: 0
        };

        ticketCounts.forEach((count) => {
          const countValue = count._count.ticketNumber || 0;
          stats.total += countValue;
          if (count.status === 'open') stats.open = countValue;
          if (count.status === 'pending') stats.pending = countValue;
          if (count.status === 'resolved') stats.resolved = countValue;
          if (count.status === 'closed') stats.closed = countValue;
        });

        parsedDepartment.stats = stats;
      }

      return res.status(200).json({ department: parsedDepartment });
    } catch (error) {
      console.error('Error fetching department:', error);
      return res.status(500).json({ message: 'Failed to fetch department', error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { name, description, departmentHeadId, isActive, slaConfig, workingHours, holidays } = req.body;

      const updateData = {};

      if (name !== undefined) {
        if (!name || name.trim() === '') {
          return res.status(400).json({ message: 'Department name cannot be empty' });
        }

        // Check if another department with same name exists
        const existing = await prisma.department.findFirst({
          where: {
            name: name.trim(),
            id: { not: id }
          }
        });

        if (existing) {
          return res.status(400).json({ message: 'Department with this name already exists' });
        }

        updateData.name = name.trim();
      }

      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }

      if (departmentHeadId !== undefined) {
        updateData.departmentHeadId = departmentHeadId || null;
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      if (slaConfig !== undefined) {
        updateData.slaConfig = slaConfig ? JSON.stringify(slaConfig) : null;
      }

      if (workingHours !== undefined) {
        updateData.workingHours = workingHours ? JSON.stringify(workingHours) : null;
      }

      if (holidays !== undefined) {
        updateData.holidays = holidays ? JSON.stringify(holidays) : null;
      }

      const department = await prisma.department.update({
        where: { id },
        data: updateData
      });

      // Parse JSON fields for response
      const parsedDepartment = {
        ...department,
        slaConfig: department.slaConfig ? JSON.parse(department.slaConfig) : null,
        workingHours: department.workingHours ? JSON.parse(department.workingHours) : null,
        holidays: department.holidays ? JSON.parse(department.holidays) : []
      };

      return res.status(200).json({ department: parsedDepartment });
    } catch (error) {
      console.error('Error updating department:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Department not found' });
      }
      return res.status(500).json({ message: 'Failed to update department', error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if department has agents
      const agentsCount = await prisma.agent.count({
        where: { departmentId: id }
      });

      if (agentsCount > 0) {
        return res.status(400).json({
          message: `Cannot delete department. It has ${agentsCount} agent(s) assigned. Please reassign agents first.`
        });
      }

      // Check if department has tickets
      const ticketsCount = await prisma.conversation.count({
        where: { departmentId: id }
      });

      if (ticketsCount > 0) {
        return res.status(400).json({
          message: `Cannot delete department. It has ${ticketsCount} ticket(s) routed to it.`
        });
      }

      await prisma.department.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Department deleted successfully' });
    } catch (error) {
      console.error('Error deleting department:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Department not found' });
      }
      return res.status(500).json({ message: 'Failed to delete department', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

