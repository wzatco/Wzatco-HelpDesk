/**
 * Server-side Authentication Utilities
 * For use in getServerSideProps to protect pages
 */

import jwt from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token from cookies or headers
 * @param {object} req - Next.js request object
 * @returns {object|null} Decoded token or null
 */
export function verifyTokenFromRequest(req) {
  try {
    // Check cookies first (set by client)
    const tokenFromCookie = req.cookies?.authToken || req.cookies?.token;
    
    // Check Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    
    // Check custom header
    const tokenFromCustomHeader = req.headers['x-auth-token'];
    
    const token = tokenFromCookie || tokenFromHeader || tokenFromCustomHeader;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get authenticated user from request
 * @param {object} req - Next.js request object
 * @returns {Promise<object|null>} User object or null
 */
export async function getAuthenticatedUser(req) {
  try {
    const decoded = verifyTokenFromRequest(req);
    
    if (!decoded || !decoded.userId) {
      return null;
    }

    // Prisma will auto-connect on first query
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          select: {
            id: true,
            title: true,
            displayAs: true,
            hasSuperPower: true
          }
        }
      }
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  } finally {
    // Note: We don't disconnect here as Prisma manages connection pooling
    // Disconnecting would break connection reuse
  }
}

/**
 * Server-side authentication check for getServerSideProps
 * Redirects to login if not authenticated
 * @param {object} context - getServerSideProps context
 * @returns {object} Props or redirect
 */
export async function requireAuth(context) {
  const { req, res } = context;
  
  const user = await getAuthenticatedUser(req);
  
  if (!user) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        type: user.type,
        roleId: user.roleId,
        role: user.role,
      },
    },
  };
}

/**
 * Optional auth - doesn't redirect, just provides user if available
 * @param {object} context - getServerSideProps context
 * @returns {object} Props with user or null
 */
export async function optionalAuth(context) {
  const { req } = context;
  
  const user = await getAuthenticatedUser(req);
  
  return {
    props: {
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        type: user.type,
        roleId: user.roleId,
        role: user.role,
      } : null,
    },
  };
}

