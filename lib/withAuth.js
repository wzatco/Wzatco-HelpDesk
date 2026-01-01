/**
 * Higher Order Component / Wrapper for getServerSideProps
 * Adds authentication check to any admin page
 * 
 * Usage:
 * export const getServerSideProps = withAuth(async (context) => {
 *   // Your page-specific logic here
 *   return { props: { ... } };
 * });
 */

import { verifyTokenFromRequest, getAuthenticatedUser } from './server-auth';

export function withAuth(getServerSidePropsFn) {
  return async (context) => {
    const { req, res } = context;
    
    // Check authentication
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      // Redirect to login with return URL
      // Use resolvedUrl but filter out Next.js internal URLs
      let returnUrl = context?.resolvedUrl || req?.url || '/admin';
      
      // Filter out Next.js data fetching URLs
      if (returnUrl.includes('/_next/data/')) {
        // Extract the actual path from the data URL
        // e.g., /_next/data/development/admin/tickets.json -> /admin/tickets
        const match = returnUrl.match(/\/_next\/data\/[^/]+(.+)\.json/);
        returnUrl = match ? match[1] : '/admin';
      }
      
      // Don't redirect to login from login page or if already on login
      if (returnUrl === '/admin/login' || returnUrl.startsWith('/admin/login?')) {
        returnUrl = '/admin';
      }
      
      // Clean up any query parameters that might cause issues
      if (returnUrl.includes('?redirect=')) {
        // If URL already has a redirect param, extract the original destination
        const redirectMatch = returnUrl.match(/redirect=([^&]+)/);
        if (redirectMatch) {
          try {
            returnUrl = decodeURIComponent(redirectMatch[1]);
            // Prevent infinite loops - if decoded URL still has redirect param, use /admin
            if (returnUrl.includes('?redirect=')) {
              returnUrl = '/admin';
            }
          } catch (e) {
            returnUrl = '/admin';
          }
        }
      }
      
      // Final safety check - ensure we don't create a redirect loop
      if (returnUrl.includes('/login')) {
        returnUrl = '/admin';
      }
      
      const loginUrl = `/admin/login?redirect=${encodeURIComponent(returnUrl)}`;
      return {
        redirect: {
          destination: loginUrl,
          permanent: false,
        },
      };
    }

    // If getServerSidePropsFn is provided, call it and merge props
    if (getServerSidePropsFn) {
      const result = await getServerSidePropsFn(context);
      
      // Merge user into props
      if (result.props) {
        result.props.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          type: user.type,
          roleId: user.roleId,
          role: user.role,
        };
      }
      
      return result;
    }

    // If no function provided, just return user
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
  };
}

