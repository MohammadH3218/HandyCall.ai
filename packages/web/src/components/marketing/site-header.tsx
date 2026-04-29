'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { IconMenu2, IconX, IconChevronDown } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '../ui/logo';
import type { User } from '@/types/shared';

type SiteHeaderVariant = 'default' | 'minimal' | 'pro';

type SiteHeaderProps = {
  variant?: SiteHeaderVariant;
  hideLogin?: boolean;
  hideLoginLink?: boolean;
  proLinks?: boolean;
};

const NAV_BASE = [
  { path: '/search', label: 'Find Services' },
  { path: '/contact', label: 'Contact' },
  { path: '/#how-it-works', label: 'How It Works' },
];

function ProfileMenu({
  fallbackUser,
  isPro = false,
}: {
  fallbackUser: Partial<User> | null;
  isPro?: boolean;
}) {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profile = user || (fallbackUser as User | null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initials =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
      : profile?.first_name
        ? profile.first_name[0].toUpperCase()
        : (profile?.email?.[0]?.toUpperCase() ?? '?');

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : (profile?.email ?? 'Account');

  const logoutHref = isPro ? '/pro/login?reason=logged_out' : '/customer/login';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:shadow"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
          {initials}
        </span>
        {isPro && (
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-900 leading-none">
            PRO
          </span>
        )}
        <span className="max-w-[120px] truncate">{displayName}</span>
        <IconChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          stroke={2}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
              {isPro && (
                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700">
                  PRO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
          </div>
          <div className="py-1">
            {isPro ? (
              <Link
                href="/pro/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/customer/dashboard/requests"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Requests
                </Link>
                <Link
                  href="/customer/dashboard/inbox"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  Inbox
                </Link>
                <Link
                  href="/customer/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <svg
                    className="h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </Link>
              </>
            )}
          </div>
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => {
                setOpen(false);
                logout(logoutHref);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteHeader({
  variant = 'default',
  hideLogin = false,
  hideLoginLink = false,
  proLinks = false,
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isMinimal = variant === 'minimal';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = NAV_BASE.map((n) => ({ ...n, href: n.path }));
  const { user, checkAuth } = useAuthStore();
  const { data: session, status } = useSession();
  const isCustomerSession = status === 'authenticated' && session?.poolType === 'customer';
  const isProSession = status === 'authenticated' && (session as any)?.poolType === 'users';

  const fallbackSessionUser = useMemo<Partial<User> | null>(() => {
    if (status !== 'authenticated') return null;

    const name = session?.user?.name?.trim() || '';
    const firstName =
      session?.user?.given_name?.trim() || (name ? name.split(' ')[0] : '') || undefined;
    const lastName =
      session?.user?.family_name?.trim() ||
      (name ? name.split(' ').slice(1).join(' ') : '') ||
      undefined;

    return {
      email: session?.user?.email || undefined,
      first_name: firstName,
      last_name: lastName,
    };
  }, [session, status]);

  useEffect(() => {
    if (!isCustomerSession) return;
    if (user?.email) return;
    void checkAuth();
  }, [checkAuth, isCustomerSession, user?.email]);

  const hasConfirmedCustomerIdentity = Boolean(user?.email || fallbackSessionUser?.email);
  // Pro profile only appears on pro-facing pages (proLinks=true). On public pages treat pro session as logged-out.
  const shouldShowProAuth = isProSession && proLinks;
  const shouldShowCustomerAuth = !isProSession && isCustomerSession && hasConfirmedCustomerIdentity;
  const shouldShowLoggedOutActions = !shouldShowCustomerAuth && !shouldShowProAuth;

  const copy = {
    forPros: 'For Pros',
    signIn: 'Log In',
    signUp: 'Sign Up',
    pricing: 'Pricing',
    proSignUp: 'Pro Sign Up',
    proLogin: 'Pro Login',
    menuAria: 'Toggle menu',
  };

  return (
    <header
      className={`sticky top-0 z-[100] transition-all duration-300 ${
        scrolled ? 'border-b-0 bg-transparent px-4 py-2' : 'border-b border-slate-200 bg-white'
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-6 transition-all duration-300 ${
          scrolled
            ? 'rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-2.5 shadow-lg backdrop-blur-md'
            : 'px-4 py-3.5'
        }`}
      >
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/" className="flex items-center">
            <Logo width={140} height={34} />
          </Link>
        </div>

        {/* Center: Nav */}
        {!isMinimal && (
          <nav className="hidden flex-1 items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {proLinks && !hideLogin && (
          <div className="hidden items-center gap-2 md:flex">
            {shouldShowProAuth ? (
              <ProfileMenu fallbackUser={fallbackSessionUser} isPro />
            ) : (
              <>
                <Link
                  href="/for-pros#pricing"
                  className="px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
                >
                  {copy.pricing}
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {copy.proSignUp}
                </Link>
                <Link
                  href="/pro/login"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {copy.proLogin}
                </Link>
              </>
            )}
          </div>
        )}
        {!proLinks && !hideLogin && (
          <div className="hidden items-center gap-2 md:flex">
            {shouldShowCustomerAuth ? <ProfileMenu fallbackUser={fallbackSessionUser} /> : null}

            {!shouldShowCustomerAuth && shouldShowLoggedOutActions && !hideLoginLink ? (
              <>
                <Link
                  href="/customer/login"
                  className="px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
                >
                  {copy.signIn}
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {copy.signUp}
                </Link>
              </>
            ) : null}

            {shouldShowCustomerAuth || shouldShowLoggedOutActions ? (
              <>
                <span className="mx-1 h-4 border-l border-slate-200" />
                <Link
                  href="/for-pros"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {copy.forPros}
                </Link>
              </>
            ) : null}
          </div>
        )}

        <button
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={copy.menuAria}
        >
          {mobileOpen ? (
            <IconX className="h-5 w-5" stroke={1.5} />
          ) : (
            <IconMenu2 className="h-5 w-5" stroke={1.5} />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          className={`space-y-1 bg-white px-4 py-4 md:hidden ${
            scrolled
              ? 'mx-4 rounded-b-2xl border-x border-b border-slate-200/80 shadow-lg'
              : 'border-t border-slate-100'
          }`}
        >
          {!isMinimal &&
            navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}

          <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
            {proLinks && shouldShowProAuth ? (
              <>
                <Link
                  href="/pro/dashboard"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={async () => {
                    setMobileOpen(false);
                    await useAuthStore.getState().logout('/pro/login?reason=logged_out');
                  }}
                >
                  Log out
                </button>
              </>
            ) : proLinks ? (
              <>
                <Link
                  href="/for-pros#pricing"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {copy.pricing}
                </Link>
                <Link
                  href="/register"
                  className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {copy.proSignUp}
                </Link>
                <Link
                  href="/pro/login"
                  className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                  onClick={() => setMobileOpen(false)}
                >
                  {copy.proLogin}
                </Link>
              </>
            ) : shouldShowCustomerAuth ? (
              <>
                <Link
                  href="/customer/dashboard/requests"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Requests
                </Link>
                <Link
                  href="/customer/dashboard/inbox"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Inbox
                </Link>
                <Link
                  href="/customer/dashboard/settings"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  href="/for-pros"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {copy.forPros}
                </Link>
                <button
                  className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={async () => {
                    setMobileOpen(false);
                    await useAuthStore.getState().logout('/customer/login');
                  }}
                >
                  Log out
                </button>
              </>
            ) : shouldShowLoggedOutActions ? (
              <>
                <Link
                  href="/for-pros"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {copy.forPros}
                </Link>

                {!hideLogin && (
                  <>
                    {!hideLoginLink && (
                      <Link
                        href="/customer/login"
                        className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setMobileOpen(false)}
                      >
                        {copy.signIn}
                      </Link>
                    )}
                    <Link
                      href="/signup"
                      className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                      onClick={() => setMobileOpen(false)}
                    >
                      {copy.signUp}
                    </Link>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
