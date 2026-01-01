import prisma from '../../../../lib/prisma';
import { verifyPasswordResetToken, clearPasswordResetToken } from '../../../../lib/utils/password-reset';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token, password, and confirm password are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must contain at least one uppercase letter' 
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must contain at least one lowercase letter' 
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must contain at least one number' 
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('Error setting password:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

