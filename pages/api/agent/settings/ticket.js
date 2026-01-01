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
          category: 'ticket'
        }
      });
      
      const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      
      return res.status(200).json({ settings: settingsObj });
    } catch (error) {
      console.error('Error fetching ticket settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
