import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
  await ensurePrismaConnected();

  if (req.method === 'GET') {
    try {
      const { activeOnly } = req.query;
      
      const where = {};
      if (activeOnly === 'true') {
        where.isActive = true;
      }

      const categories = await prisma.issueCategory.findMany({
        where,
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ]
      });

      return res.status(200).json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Error fetching issue categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching issue categories',
        error: error.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, isActive = true, order = 0 } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      // Check if category with same name already exists
      const existing = await prisma.issueCategory.findUnique({
        where: { name: name.trim() }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      const category = await prisma.issueCategory.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isActive: isActive === true || isActive === 1,
          order: parseInt(order) || 0
        }
      });

      return res.status(201).json({
        success: true,
        category
      });
    } catch (error) {
      console.error('Error creating issue category:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating issue category',
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

