import { getUserPermissionsMap } from '../../../../../lib/permissions';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
      }

      const permissionsData = await getUserPermissionsMap(id);

      res.status(200).json({ 
        success: true,
        ...permissionsData
      });
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error', 
        error: error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} not allowed` 
    });
  }
}

