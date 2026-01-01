/**
 * Next.js Middleware
 * Protects all /admin and /agent routes (except login pages)
 * Note: Full token verification happens in getServerSideProps
 * This is just a basic check to redirect if no cookie exists
 */

import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Allow login pages, set-password pages, API routes, and static files
  if (
    pathname === '/admin/login' || 
    pathname === '/agent/login' ||
    pathname.startsWith('/agent/set-password') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Protect all other /admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('authToken')?.value;
    
    // If no token cookie, redirect to login (but avoid redirect loops)
    if (!token) {
      // Don't redirect if already going to login
      if (pathname !== '/admin/login') {
        const loginUrl = new URL('/admin/login', request.url);
        // Only set redirect parameter if not already there and not a login page
        if (!pathname.includes('/login')) {
          loginUrl.searchParams.set('redirect', pathname + (request.nextUrl.search || ''));
        }
        return NextResponse.redirect(loginUrl);
      }
    }
  }
  
  // Protect all other /agent routes
  if (pathname.startsWith('/agent')) {
    const token = request.cookies.get('agentAuthToken')?.value;
    
    // If no token cookie, redirect to login
    if (!token) {
      // Don't redirect if already going to login
      if (pathname !== '/agent/login') {
        const loginUrl = new URL('/agent/login', request.url);
        // Only set redirect parameter if not already there and not a login page
        if (!pathname.includes('/login')) {
          // Filter out Next.js data fetching URLs
          let redirectPath = pathname + (request.nextUrl.search || '');
          if (redirectPath.includes('/_next/data/')) {
            const match = redirectPath.match(/\/_next\/data\/[^/]+(.+)\.json/);
            redirectPath = match ? match[1] : '/agent';
          }
          // Encode the redirect path properly
          loginUrl.searchParams.set('redirect', redirectPath);
        }
        return NextResponse.redirect(loginUrl);
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/agent/:path*',
  ],
};

