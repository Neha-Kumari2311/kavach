import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { hasRole } from '@/lib/auth-helpers';
import { isPublicRoute, getRequiredRole, requiresAuth } from '@/lib/route-config';

/**
 * Middleware for role-based route protection
 * Protects routes based on user roles:
 * - /user/* or /dashboard/* → requires "user" role
 * - /company/* → requires "company" role
 * - /admin/* → requires "admin" role
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  // Get the JWT token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If no token, user is not authenticated - redirect to login
  if (!token) {
    const loginUrl = new URL('/api/auth/signin', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user role from token
  const userRole = token.role;
  const requiredRole = getRequiredRole(pathname);

  // If no required role found, allow access (shouldn't happen, but safety check)
  if (!requiredRole) {
    return NextResponse.next();
  }

  // Check if user has the required role
  if (!hasRole(userRole, requiredRole)) {
    // User is authenticated but accessing wrong dashboard — redirect to their correct one
    const correctDashboard = userRole === 'company' ? '/company/dashboard'
      : userRole === 'admin' ? '/admin/dashboard'
      : '/user/dashboard';
    
    // Only redirect if they're not already going to their dashboard
    if (!pathname.startsWith(correctDashboard.split('/dashboard')[0])) {
      return NextResponse.redirect(new URL(correctDashboard, request.url));
    }

    // If somehow still wrong, redirect to login
    const loginUrl = new URL('/api/auth/signin', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    loginUrl.searchParams.set('error', 'AccessDenied');
    return NextResponse.redirect(loginUrl);
  }

  // User has required role - allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes - handled by NextAuth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ],
};
