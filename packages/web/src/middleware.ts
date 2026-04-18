import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware for route protection.
 *
 * Admin routes (/admin/*) require poolType='admin'.
 *   - Unauthenticated → /admin/login
 *   - Wrong pool → /admin/login
 *
 * Pro dashboard routes (/dashboard/*) are legacy — rewrite to /pro/dashboard.
 *
 * Everything else is public.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostHeader = request.headers.get('host') || '';
  const host = hostHeader.split(':')[0]?.toLowerCase();
  const adminHost = (
    process.env.NEXT_PUBLIC_ADMIN_PORTAL_HOST ||
    process.env.ADMIN_PORTAL_HOST ||
    ''
  ).toLowerCase();

  // admin.handycall.org → prefix all non-/admin paths with /admin
  if (adminHost && host === adminHost && !pathname.startsWith('/admin')) {
    return NextResponse.redirect(
      new URL(`/admin${pathname === '/' ? '' : pathname}`, request.url),
    );
  }

  // Legacy /dashboard/login rewrite
  if (pathname === '/dashboard/login') {
    const loginUrl = new URL('/pro/login', request.url);
    loginUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(loginUrl);
  }

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  // Only guard admin routes; everything else is public
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const poolType = (token as any)?.poolType as string | undefined;
  const tokenError = (token as any)?.error as string | undefined;

  if (!token || tokenError || poolType !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
