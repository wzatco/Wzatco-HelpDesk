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
      const returnUrl = req?.url || context?.resolvedUrl || '/admin';
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

