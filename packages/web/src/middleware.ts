import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@handycall/shared';

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
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register'];
  const isPublic = publicRoutes.includes(pathname);

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const userRole = (token as any)?.userRole as string | undefined;

  if (isPublic && !token) {
    return NextResponse.next();
  }

  if (isPublic && token) {
    // Already signed in -> send to appropriate home
    const target = userRole === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');

  // Not signed in -> send to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin user hitting customer dashboard -> send to admin
  if (userRole === 'admin' && isDashboardRoute) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Customer hitting admin -> redirect to dashboard
  if (userRole !== 'admin' && isAdminRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

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

