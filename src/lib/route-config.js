import { ROLES } from './constants';

/**
 * Route configuration for role-based access control
 * 
 * Maps URL path patterns to required roles.
 * 
 * Note: Next.js route groups like (user), (company), (admin) don't appear in URLs.
 * To protect routes in these groups, create routes with explicit prefixes:
 * 
 * - (user) group → create routes like /user/* or /dashboard/*
 * - (company) group → create routes like /company/*
 * - (admin) group → create routes like /admin/*
 * 
 * Example structure:
 *   app/
 *     (user)/
 *       user/
 *         dashboard/
 *           page.js  → URL: /user/dashboard
 *     (company)/
 *       company/
 *         dashboard/
 *           page.js  → URL: /company/dashboard
 *     (admin)/
 *       admin/
 *         dashboard/
 *           page.js  → URL: /admin/dashboard
 */

/**
 * Route-to-role mapping
 * Key: URL path prefix (must start with /)
 * Value: Required role
 */
export const ROUTE_ROLE_MAP = {
  // User routes
  '/user': ROLES.USER,
  '/dashboard': ROLES.USER,
  '/store': ROLES.USER,
  
  // Company routes
  '/company': ROLES.COMPANY,
  
  // Admin routes
  '/admin': ROLES.ADMIN,
};

/**
 * Public routes that don't require authentication
 * These routes are accessible to everyone
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/register',
  '/api/auth/reset-password',
];

/**
 * Check if a route is public (doesn't require authentication)
 * @param {string} pathname - The route pathname
 * @returns {boolean} - True if route is public
 */
export function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some((route) => {
    if (pathname === route) return true;
    // Only treat it as a prefix match when the next segment boundary is present.
    // This avoids `'/'` accidentally matching every route.
    return pathname.startsWith(`${route}/`);
  });
}

/**
 * Get required role for a given route path
 * @param {string} pathname - The route pathname
 * @returns {string|null} - Required role or null if route doesn't need protection
 */
export function getRequiredRole(pathname) {
  // Check if route is public first
  if (isPublicRoute(pathname)) {
    return null;
  }

  // Normalize pathname (remove trailing slash, ensure it starts with /)
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' 
    ? pathname.slice(0, -1) 
    : pathname;

  // Check each route pattern
  for (const [routePattern, requiredRole] of Object.entries(ROUTE_ROLE_MAP)) {
    if (normalizedPath.startsWith(routePattern)) {
      return requiredRole;
    }
  }

  // No role requirement found
  return null;
}

/**
 * Check if a route requires authentication
 * @param {string} pathname - The route pathname
 * @returns {boolean} - True if route requires authentication
 */
export function requiresAuth(pathname) {
  return getRequiredRole(pathname) !== null;
}
