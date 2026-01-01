// Widget API - Get Socket JWT Token for Google Auth Users
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/widget/auth/token
 * Returns a Socket JWT token for users authenticated via Google (NextAuth)
 * This allows Google Auth users to have the same socket authentication as OTP users
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

    try {
    // Get NextAuth JWT token (for Google Auth users)
    // This is the same approach used in widget-callback.js
    const nextAuthToken = await getToken({ 
      req, 
      secret: NEXTAUTH_SECRET
    });

    if (!nextAuthToken || !nextAuthToken.email) {
      return res.status(401).json({
        success: false,
        message: 'No active session found. Please sign in with Google first.'
      });
    }

    const email = nextAuthToken.email.toLowerCase();
    const name = nextAuthToken.name || email.split('@')[0];

    // Find or create Customer record
    let customer = await prisma.customer.findUnique({
      where: { email: email }
    });

    if (!customer) {
      // Create customer if doesn't exist (should already exist from NextAuth signIn callback, but just in case)
      customer = await prisma.customer.create({
        data: {
          email: email,
          name: name
        }
      });
    }

    // Generate JWT token for widget user (same format as OTP flow)
    const widgetToken = jwt.sign(
      {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        type: 'customer'
      },
      JWT_SECRET,
      { expiresIn: '30d' } // Token expires in 30 days (matches OTP flow)
    );

    return res.status(200).json({
      success: true,
      token: widgetToken,
      message: 'Token generated successfully'
    });

  } catch (error) {
    console.error('Error generating widget token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating token',
      error: error.message
    });
  }
}

