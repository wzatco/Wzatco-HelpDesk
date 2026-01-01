/**
 * usePermissions Hook
 * React hook for checking user permissions on the frontend
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function usePermissions(userIdProp) {
  const { userId: authUserId, isSuperAdmin: authIsSuperAdmin } = useAuth();
  const userId = userIdProp || authUserId;
  const [permissions, setPermissions] = useState({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(authIsSuperAdmin || false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user permissions from API
  const fetchPermissions = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/permissions`);
      const data = await response.json();

      if (response.ok) {
        setPermissions(data.permissions || {});
        setIsSuperAdmin(data.isSuperAdmin || false);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch permissions');
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Check if user has permission to access a page
   * @param {string} pageName - The page name (e.g., 'admin.tickets')
   * @returns {boolean}
   */
  const hasPermission = useCallback((pageName) => {
    if (isSuperAdmin) return true;
    return permissions[pageName] === true;
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} pageNames - Array of page names
   * @returns {boolean}
   */
  const hasAnyPermission = useCallback((pageNames) => {
    if (isSuperAdmin) return true;
    return pageNames.some(pageName => permissions[pageName] === true);
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has all of the specified permissions
   * @param {string[]} pageNames - Array of page names
   * @returns {boolean}
   */
  const hasAllPermissions = useCallback((pageNames) => {
    if (isSuperAdmin) return true;
    return pageNames.every(pageName => permissions[pageName] === true);
  }, [permissions, isSuperAdmin]);

  return {
    permissions,
    isSuperAdmin,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchPermissions
  };
}

/**
 * PermissionGuard Component
 * Conditionally render children based on permission
 */
export function PermissionGuard({ children, requiredPermission, fallback = null, userId }) {
  const { hasPermission, loading, isSuperAdmin } = usePermissions(userId);

  if (loading) {
    return fallback;
  }

  if (isSuperAdmin || hasPermission(requiredPermission)) {
    return children;
  }

  return fallback;
}

/**
 * usePageAccess Hook
 * Check if user has access to current page and redirect if not
 */
export function usePageAccess(pageName, userId, redirectUrl = '/admin/login') {
  const { hasPermission, loading, isSuperAdmin } = usePermissions(userId);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!loading) {
      const access = isSuperAdmin || hasPermission(pageName);
      setHasAccess(access);

      if (!access && typeof window !== 'undefined') {
        // Redirect to login or unauthorized page
        window.location.href = redirectUrl;
      }
    }
  }, [loading, isSuperAdmin, hasPermission, pageName, redirectUrl]);

  return { hasAccess, loading };
}

export default usePermissions;

