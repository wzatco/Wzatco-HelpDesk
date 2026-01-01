import prisma from '../../../../lib/prisma';
import { verifyPasswordResetToken } from '../../../../lib/utils/password-reset';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }

    const user = await verifyPasswordResetToken(prisma, token);

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    // Check if user is linked to an agent
    if (!user.agent || !user.agent.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Agent account is not active' 
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        agent: {
          id: user.agent.id,
          name: user.agent.name
        }
      }
    });
  } catch (error) {
    console.error('Error verifying setup token:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

