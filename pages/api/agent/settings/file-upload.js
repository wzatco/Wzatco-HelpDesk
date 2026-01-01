import prisma from '../../../../lib/prisma';
import { getCurrentAgent } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  // Verify agent authentication
  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await prisma.settings.findMany({
        where: {
          category: 'file-upload'
        }
      });
      
      const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      
      return res.status(200).json({ 
        settings: settingsObj,
        maxFileSize: settingsObj.maxFileSize || '10MB',
        allowedTypes: settingsObj.allowedTypes || 'image/*,.pdf,.doc,.docx,.txt'
      });
    } catch (error) {
      console.error('Error fetching file upload settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
