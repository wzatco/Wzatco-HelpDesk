import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const template = await prisma.ticketTemplate.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      res.status(200).json({ success: true, template });
    } catch (error) {
      console.error('Error fetching ticket template:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const {
        name,
        description,
        subject,
        message,
        category,
        priority,
        productId,
        departmentId,
        tags,
        isActive
      } = req.body;

      // Parse tags if provided
      let tagsJson = undefined;
      if (tags !== undefined) {
        try {
          tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : tags;
        } catch (e) {
          console.error('Error parsing tags:', e);
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (subject !== undefined) updateData.subject = subject;
      if (message !== undefined) updateData.message = message;
      if (category !== undefined) updateData.category = category;
      if (priority !== undefined) updateData.priority = priority;
      if (productId !== undefined) updateData.productId = productId || null;
      if (departmentId !== undefined) updateData.departmentId = departmentId || null;
      if (tagsJson !== undefined) updateData.tags = tagsJson;
      if (isActive !== undefined) updateData.isActive = isActive;

      const template = await prisma.ticketTemplate.update({
        where: { id },
        data: updateData,
        include: {
          product: {
            select: {
              id: true,
              name: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(200).json({ success: true, template });
    } catch (error) {
      console.error('Error updating ticket template:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.ticketTemplate.delete({
        where: { id }
      });

      res.status(200).json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting ticket template:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

