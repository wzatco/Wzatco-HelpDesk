import prisma from '../../../../lib/prisma';

/**
 * GET /api/admin/worklogs/reasons
 * Fetch all worklog reasons (for admin panel)
 * 
 * POST /api/admin/worklogs/reasons
 * Create a new worklog reason
 * 
 * PATCH /api/admin/worklogs/reasons/[id]
 * Update a worklog reason
 * 
 * DELETE /api/admin/worklogs/reasons/[id]
 * Delete/deactivate a worklog reason
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { activeOnly } = req.query;
      
      const where = {};
      if (activeOnly === 'true') {
        where.isActive = true;
      }

      const reasons = await prisma.worklogReason.findMany({
        where,
        orderBy: [
          { type: 'asc' },
          { name: 'asc' }
        ]
      });

      return res.status(200).json({
        success: true,
        data: reasons
      });

    } catch (error) {
      console.error('Error fetching worklog reasons:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, type, isActive = true } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'name and type are required'
        });
      }

      if (!['BREAK', 'WORK', 'OTHER'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'type must be one of: BREAK, WORK, OTHER'
        });
      }

      const reason = await prisma.worklogReason.create({
        data: {
          name,
          type,
          isActive
        }
      });

      return res.status(201).json({
        success: true,
        data: reason
      });

    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A reason with this name already exists'
        });
      }
      console.error('Error creating worklog reason:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error.message 
      });
    }
  }

  return res.status(405).json({ 
    success: false,
    message: 'Method not allowed' 
  });
}

