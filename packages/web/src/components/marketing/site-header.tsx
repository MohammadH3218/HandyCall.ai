'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '../ui/logo';
import { IconMenu2, IconX } from '@tabler/icons-react';

type SiteHeaderVariant = 'consumer' | 'pro' | 'minimal';

type SiteHeaderProps = {
  variant?: SiteHeaderVariant;
  ctaLabel?: string;
  ctaHref?: string;
  hideLogin?: boolean;
  hideLoginLink?: boolean;
};

const CONSUMER_LINKS = [
  { href: '/find-pros', label: 'Find Services' },
  { href: '/categories', label: 'Categories' },
  { href: '/how-it-works', label: 'How It Works' },
];

const PRO_LINKS = [
  { href: '/pros#features', label: 'Features' },
  { href: '/pros/pricing', label: 'Pricing' },
  { href: '/how-it-works', label: 'How It Works' },
];

export function SiteHeader({
  variant,
  ctaLabel,
  ctaHref,
  hideLogin = false,
  hideLoginLink = false,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const resolvedVariant: SiteHeaderVariant =
    variant ?? (pathname?.startsWith('/pros') ? 'pro' : 'consumer');

  const isPro = resolvedVariant === 'pro';
  const links = isPro ? PRO_LINKS : CONSUMER_LINKS;
  const loginHref = isPro ? '/login?audience=pro' : '/customer/login';
  const loginLabel = isPro ? 'Log In' : 'Customer Login';
  const resolvedCtaHref = ctaHref ?? (isPro ? '/register?audience=pro' : '/register?audience=customer');
  const resolvedCtaLabel = ctaLabel ?? (isPro ? 'Get Started Free' : 'Sign Up');

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Logo width={140} height={34} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA area */}
        {!hideLogin && (
          <div className="hidden md:flex items-center gap-1">
          {isPro ? (
            <>
              <Link
                href="/"
                className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 transition-colors"
              >
                For Customers
              </Link>
              {!hideLoginLink && (
                <Link
                  href={loginHref}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 transition-colors"
                >
                  {loginLabel}
                </Link>
              )}
              <Link
                href={resolvedCtaHref}
                className="ml-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                {resolvedCtaLabel}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/pros"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
              >
                Join as a Pro
              </Link>
              {!hideLoginLink && (
                <Link
                  href={loginHref}
                  className="ml-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {loginLabel}
                </Link>
              )}
            </>
          )}
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <IconX className="h-5 w-5" stroke={1.5} /> : <IconMenu2 className="h-5 w-5" stroke={1.5} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!hideLogin && (
            <div className="pt-3 border-t border-slate-100 space-y-2 mt-2">
            {isPro ? (
              <>
                {!hideLoginLink && (
                  <Link
                    href={loginHref}
                    className="block w-full text-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    {loginLabel}
                  </Link>
                )}
                <Link
                  href={resolvedCtaHref}
                  className="block w-full text-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  onClick={() => setMobileOpen(false)}
                >
                  {resolvedCtaLabel}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/pros"
                  className="block w-full text-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Join as a Pro
                </Link>
                {!hideLoginLink && (
                  <Link
                    href={loginHref}
                    className="block w-full text-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    {loginLabel}
                  </Link>
                )}
              </>
            )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
