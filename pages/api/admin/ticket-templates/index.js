import prisma from '@/lib/prisma';


export default async function handler(req, res) {
    if (req.method === 'GET') {
    try {
      const { category, productId, departmentId, activeOnly = 'true' } = req.query;

      const where = {};
      
      if (activeOnly === 'true') {
        where.isActive = true;
      }

      if (category) {
        where.category = category;
      }

      if (productId) {
        where.productId = productId;
      }

      if (departmentId) {
        where.departmentId = departmentId;
      }

      const templates = await prisma.ticketTemplate.findMany({
        where,
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
        },
        orderBy: {
          usageCount: 'desc' // Most used templates first
        }
      });

      res.status(200).json({ success: true, templates });
    } catch (error) {
      console.error('Error fetching ticket templates:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } 
  } else if (req.method === 'POST') {
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
        isActive = true
      } = req.body;

      if (!name || !message) {
        return res.status(400).json({
          success: false,
          message: 'Name and message are required'
        });
      }

      // Parse tags if provided as JSON string
      let tagsJson = null;
      if (tags) {
        try {
          tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : tags;
        } catch (e) {
          console.error('Error parsing tags:', e);
        }
      }

      const template = await prisma.ticketTemplate.create({
        data: {
          name,
          description,
          subject,
          message,
          category,
          priority,
          productId: productId || null,
          departmentId: departmentId || null,
          tags: tagsJson,
          isActive
        },
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

      res.status(201).json({ success: true, template });
    } catch (error) {
      console.error('Error creating ticket template:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } 
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

