/**
 * Authentication Middleware and Utilities
 * Handles JWT verification and user authentication
 */

import jwt from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Extract and verify JWT token from request
 * @param {object} req - Request object
 * @returns {object|null} Decoded token data or null
 */
export function verifyToken(req) {
  try {
    // Check multiple sources for token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.replace('Bearer ', '') || 
                  req.headers['x-auth-token'] ||
                  req.cookies?.authToken ||
                  req.cookies?.token;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
}

/**
 * Get current user ID from request
 * @param {object} req - Request object
 * @returns {string|null} User ID or null
 */
export function getCurrentUserId(req) {
  // Try token first
  const decoded = verifyToken(req);
  if (decoded?.userId) {
    return decoded.userId;
  }

  // Fallback to header (for development/testing)
  return req.headers['x-user-id'] || null;
}

/**
 * Get current user with role information
 * @param {object} req - Request object
 * @returns {Promise<object|null>} User object with role or null
 */
export async function getCurrentUser(req) {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
  // Note: Don't disconnect Prisma client as it's a singleton shared across requests
}

/**
 * Middleware to require authentication
 * @param {Function} handler - The actual API handler
 * @returns {Function} Wrapped handler with auth check
 */
export function requireAuth(handler) {
  return async (req, res) => {
    const userId = getCurrentUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Please log in to access this resource'
      });
    }

    // Attach userId to request for handler to use
    req.userId = userId;

    return handler(req, res);
  };
}

/**
 * Combined middleware for authentication and permission checking
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @param {Function} handler - The actual API handler
 * @returns {Function} Wrapped handler with auth and permission check
 */
export function requireAuthAndPermission(requiredPermissions, handler) {
  return async (req, res) => {
    const userId = getCurrentUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Please log in to access this resource'
      });
    }

    // Import here to avoid circular dependency
    const { checkPermissionOrFail } = await import('./permissions.js');
    
    const hasAccess = await checkPermissionOrFail(userId, requiredPermissions, res);
    if (!hasAccess) {
      return; // checkPermissionOrFail already sent error response
    }

    // Attach userId to request for handler to use
    req.userId = userId;

    return handler(req, res);
  };
}

/**
 * Generate JWT token for a user
 * @param {object} user - User object
 * @returns {string} JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      type: user.type
    },
    JWT_SECRET,
    { expiresIn: '15d' }
  );
}

export default {
  verifyToken,
  getCurrentUserId,
  getCurrentUser,
  requireAuth,
  requireAuthAndPermission,
  generateToken
};

