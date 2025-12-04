/**
 * Permission Enforcement System
 * This module provides utilities to check and enforce role-based permissions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get user's role and permissions from database
 * @param {string} userId - The user ID
 * @returns {Promise<{role: object, permissions: array}>}
 */
export async function getUserPermissions(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user || !user.role) {
      return { role: null, permissions: [] };
    }

    return {
      role: user.role,
      permissions: user.role.permissions || []
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return { role: null, permissions: [] };
  }
}

/**
 * Check if user has permission to access a specific page
 * @param {string} userId - The user ID
 * @param {string} pageName - The page name (e.g., 'admin.tickets')
 * @returns {Promise<boolean>}
 */
export async function hasPermission(userId, pageName) {
  try {
    const { role, permissions } = await getUserPermissions(userId);

    // Super Admin has access to everything
    if (role?.hasSuperPower) {
      return true;
    }

    // Check if user has explicit permission for this page
    const permission = permissions.find(p => p.pageName === pageName);
    return permission?.hasAccess || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 * @param {string} userId - The user ID
 * @param {string[]} pageNames - Array of page names
 * @returns {Promise<boolean>}
 */
export async function hasAnyPermission(userId, pageNames) {
  try {
    const { role, permissions } = await getUserPermissions(userId);

    // Super Admin has access to everything
    if (role?.hasSuperPower) {
      return true;
    }

    // Check if user has any of the specified permissions
    return pageNames.some(pageName => {
      const permission = permissions.find(p => p.pageName === pageName);
      return permission?.hasAccess || false;
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Check if user has all of the specified permissions
 * @param {string} userId - The user ID
 * @param {string[]} pageNames - Array of page names
 * @returns {Promise<boolean>}
 */
export async function hasAllPermissions(userId, pageNames) {
  try {
    const { role, permissions } = await getUserPermissions(userId);

    // Super Admin has access to everything
    if (role?.hasSuperPower) {
      return true;
    }

    // Check if user has all specified permissions
    return pageNames.every(pageName => {
      const permission = permissions.find(p => p.pageName === pageName);
      return permission?.hasAccess || false;
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Middleware to protect API routes with permission checking
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @returns {Function} Middleware function
 */
export function requirePermission(requiredPermissions) {
  return async (req, res, next) => {
    try {
      // Get user ID from session/token (implement based on your auth system)
      const userId = req.session?.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized: No user session found' 
        });
      }

      const { role } = await getUserPermissions(userId);

      // Super Admin bypass
      if (role?.hasSuperPower) {
        return next ? next() : true;
      }

      // Check permissions
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      const hasAccess = await hasAllPermissions(userId, permissions);

      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: You do not have permission to access this resource',
          requiredPermissions: permissions
        });
      }

      return next ? next() : true;
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error while checking permissions' 
      });
    }
  };
}

/**
 * Check permission and return appropriate response
 * @param {string} userId - The user ID
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @param {object} res - Response object
 * @returns {Promise<boolean>} - Returns true if authorized, sends error response otherwise
 */
export async function checkPermissionOrFail(userId, requiredPermissions, res) {
  try {
    if (!userId) {
      res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: Please log in' 
      });
      return false;
    }

    const { role } = await getUserPermissions(userId);

    // Super Admin bypass
    if (role?.hasSuperPower) {
      return true;
    }

    // Check permissions
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    const hasAccess = await hasAllPermissions(userId, permissions);

    if (!hasAccess) {
      res.status(403).json({ 
        success: false, 
        message: 'Forbidden: You do not have permission to perform this action',
        requiredPermissions: permissions
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while checking permissions' 
    });
    return false;
  }
}

/**
 * Get all permissions for a user in a format suitable for frontend
 * @param {string} userId - The user ID
 * @returns {Promise<object>} - Object with page names as keys and boolean values
 */
export async function getUserPermissionsMap(userId) {
  try {
    const { role, permissions } = await getUserPermissions(userId);

    // Super Admin has all permissions
    if (role?.hasSuperPower) {
      return { isSuperAdmin: true, permissions: {} };
    }

    // Convert permissions array to object map
    const permissionsMap = {};
    permissions.forEach(perm => {
      permissionsMap[perm.pageName] = perm.hasAccess;
    });

    return { 
      isSuperAdmin: false, 
      permissions: permissionsMap,
      roleId: role?.id,
      roleTitle: role?.title
    };
  } catch (error) {
    console.error('Error getting permissions map:', error);
    return { isSuperAdmin: false, permissions: {} };
  }
}

export default {
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  checkPermissionOrFail,
  getUserPermissionsMap
};

