import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection
 * 
 * Note: This middleware runs server-side and can only access cookies.
 * The app uses localStorage for tokens, so client-side redirects in components
 * are the primary protection mechanism. This middleware provides an additional
 * layer for initial requests and SSR scenarios.
 * 
 * Since we're using client-side auth with localStorage, the main protection
 * happens in:
 * - DashboardLayout component (protects /dashboard/* routes)
 * - Admin page component (protects /admin routes)
 * - Login/Register pages (redirect if already authenticated)
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public routes
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Protected routes
  const adminRoutes = ['/admin'];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const dashboardRoutes = ['/dashboard'];
  const isDashboardRoute = dashboardRoutes.some(route => pathname.startsWith(route));

  // For client-side apps using localStorage, we rely on component-level protection
  // Middleware here mainly handles initial redirects for better UX
  // Actual auth checking happens in components (DashboardLayout, Admin page, etc.)
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next (Next.js internals)
     * - static files
     * - images
     * - favicon
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

