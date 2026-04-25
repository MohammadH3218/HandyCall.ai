import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@/lib/shared';

function buildProtectedCallback(pathname: string, search: string) {
  const pathWithSearch = `${pathname}${search}`;

  if (pathname === '/dashboard/login' || pathname === '/dashboard') {
    return '/dashboard';
  }

  if (pathname === '/onboarding' || pathname === '/onboarding/setup') {
    return '/onboarding/account-setup';
  }

  if (pathname === '/customer/onboarding' && !search) {
    return '/customer/onboarding?callbackUrl=%2Fcustomer%2Fdashboard';
  }

  return pathWithSearch;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const hostHeader = request.headers.get('host') || '';
  const host = hostHeader.split(':')[0]?.toLowerCase();
  const canonicalHost = (
    process.env.NEXT_PUBLIC_CANONICAL_HOST ||
    process.env.CANONICAL_HOST ||
    'handycall.org'
  ).toLowerCase();
  const canonicalWwwHost = canonicalHost.startsWith('www.')
    ? canonicalHost
    : `www.${canonicalHost}`;
  const adminHost = (
    process.env.NEXT_PUBLIC_ADMIN_PORTAL_HOST ||
    process.env.ADMIN_PORTAL_HOST ||
    ''
  ).toLowerCase();
  const userHost = (
    process.env.NEXT_PUBLIC_USER_PORTAL_HOST ||
    process.env.USER_PORTAL_HOST ||
    ''
  ).toLowerCase();

  if (host === canonicalWwwHost && canonicalHost && canonicalHost !== canonicalWwwHost) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.hostname = canonicalHost;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Some hosting rewrites can map /login -> /dashboard/login.
  // Rewriting (not redirecting) prevents infinite 307 loops.
  if (pathname === '/dashboard/login') {
    const loginUrl = new URL('/pro/login', request.url);
    loginUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(loginUrl);
  }

  // Host-based routing for user/admin portals.
  if (adminHost && host === adminHost) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (pathname === '/login' || pathname === '/pro/login') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.search = request.nextUrl.search;
      return NextResponse.redirect(loginUrl);
    }
    if (!pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  if (userHost && host === userHost) {
    if (pathname.startsWith('/admin')) {
      if (adminHost) {
        const redirectUrl = new URL(request.url);
        redirectUrl.hostname = adminHost;
        return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Guard dashboard/admin/onboarding routes with the NextAuth session cookie.
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isCustomerDashboardRoute = pathname.startsWith('/customer/dashboard');
  const isCustomerOnboardingRoute = pathname.startsWith('/customer/onboarding');
  const isAdminLoginRoute = pathname === '/admin/login';
  const isCustomerProtectedRoute = isCustomerDashboardRoute || isCustomerOnboardingRoute;
  if (!isAdminRoute && !isDashboardRoute && !isOnboardingRoute && !isCustomerProtectedRoute) {
    return NextResponse.next();
  }

  if (isAdminLoginRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const userRole = (token as any)?.userRole as string | undefined;
  const hasBearer = Boolean((token as any)?.idToken || (token as any)?.accessToken);
  const poolType = ((token as any)?.poolType as string | undefined) || '';

  // Not signed in -> send to login with callback
  if (!token || !hasBearer) {
    const loginPath = isAdminRoute
      ? '/admin/login'
      : isCustomerProtectedRoute
        ? '/customer/login'
        : '/pro/login';
    const loginUrl = new URL(loginPath, request.url);
    const safeCallback = buildProtectedCallback(pathname, search);
    loginUrl.searchParams.set('callbackUrl', safeCallback);
    return NextResponse.redirect(loginUrl);
  }

  // Admin pool must stay in admin portal.
  if (poolType === 'admin' && isDashboardRoute) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Dashboard is for pro/users pool only.
  if (isDashboardRoute && poolType !== 'users') {
    const loginUrl = new URL('/pro/login', request.url);
    loginUrl.searchParams.set('callbackUrl', buildProtectedCallback(pathname, search));
    return NextResponse.redirect(loginUrl);
  }

  if (isOnboardingRoute) {
    if (poolType === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    if (poolType !== 'users') {
      const loginUrl = new URL('/pro/login', request.url);
      loginUrl.searchParams.set('callbackUrl', buildProtectedCallback(pathname, search));
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isCustomerProtectedRoute && poolType !== 'customer') {
    const loginUrl = new URL('/customer/login', request.url);
    loginUrl.searchParams.set('callbackUrl', buildProtectedCallback(pathname, search));
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes must use admin pool only.
  if (isAdminRoute && poolType !== 'admin' && userRole !== UserRole.ADMIN) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', buildProtectedCallback(pathname, search));
    return NextResponse.redirect(loginUrl);
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
