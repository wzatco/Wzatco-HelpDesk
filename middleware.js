/**
 * Next.js Middleware
 * Protects all /admin routes (except /admin/login)
 * Note: Full token verification happens in getServerSideProps
 * This is just a basic check to redirect if no cookie exists
 */

import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Allow login page, API routes, and static files
  if (
    pathname === '/admin/login' || 
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
    
    // If no token cookie, redirect to login
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};

