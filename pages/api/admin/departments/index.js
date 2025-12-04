import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { includeAgents = 'false', includeStats = 'false' } = req.query;
      
      const departments = await prisma.department.findMany({
        orderBy: { name: 'asc' },
        include: includeAgents === 'true' ? {
          agents: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true
            }
          }
        } : undefined
      });

      // If stats are requested, add ticket counts
      if (includeStats === 'true') {
        const departmentsWithStats = await Promise.all(
          departments.map(async (dept) => {
            const ticketCounts = await prisma.conversation.groupBy({
              by: ['status'],
              where: { departmentId: dept.id },
              _count: { id: true }
            });

            const stats = {
              total: 0,
              open: 0,
              pending: 0,
              resolved: 0,
              closed: 0
            };

            ticketCounts.forEach((count) => {
              stats.total += count._count.id;
              if (count.status === 'open') stats.open = count._count.id;
              if (count.status === 'pending') stats.pending = count._count.id;
              if (count.status === 'resolved') stats.resolved = count._count.id;
              if (count.status === 'closed') stats.closed = count._count.id;
            });

            return {
              ...dept,
              stats
            };
          })
        );

        return res.status(200).json({ departments: departmentsWithStats });
      }

      return res.status(200).json({ departments });
    } catch (error) {
      console.error('Error fetching departments:', error);
      return res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, isActive = true, slaConfig, workingHours, holidays } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Department name is required' });
      }

      // Check if department with same name exists
      const existing = await prisma.department.findUnique({
        where: { name: name.trim() }
      });

      if (existing) {
        return res.status(400).json({ message: 'Department with this name already exists' });
      }

      const department = await prisma.department.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isActive: isActive !== false,
          slaConfig: slaConfig ? JSON.stringify(slaConfig) : null,
          workingHours: workingHours ? JSON.stringify(workingHours) : null,
          holidays: holidays ? JSON.stringify(holidays) : null
        }
      });

      return res.status(201).json({ department });
    } catch (error) {
      console.error('Error creating department:', error);
      return res.status(500).json({ message: 'Failed to create department', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

