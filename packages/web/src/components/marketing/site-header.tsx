'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '../ui/logo';
import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';

type SiteHeaderVariant = 'consumer' | 'pro' | 'minimal';

type SiteHeaderProps = {
  variant?: SiteHeaderVariant;
  ctaLabel?: string;
  ctaHref?: string;
  hideLogin?: boolean;
  hideLoginLink?: boolean;
};

function ConsumerNav() {
  return (
    <>
      <Link href="/find-pros" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
        Find Services
      </Link>
      <Link href="/categories" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
        Categories
      </Link>
      <Link href="/how-it-works" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
        How It Works
      </Link>
    </>
  );
}

function ProNav() {
  return (
    <>
      <Link href="/pros#features" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
        Features
      </Link>
      <Link href="/pros/pricing" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
        Pricing
      </Link>
      <Link href="/" className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700">
        For Customers
      </Link>
    </>
  );
}

export function SiteHeader({
  variant,
  ctaLabel,
  ctaHref,
  hideLogin = false,
  hideLoginLink = false,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-detect variant from path if not provided
  const resolvedVariant: SiteHeaderVariant =
    variant ?? (pathname?.startsWith('/pros') ? 'pro' : 'consumer');

  const isPro = resolvedVariant === 'pro';
  const resolvedCta = ctaLabel ?? (isPro ? 'Get Started' : 'List Your Business');
  const resolvedCtaHref = ctaHref ?? (isPro ? '/pros/signup' : '/register');
  const loginHref = isPro ? '/login' : '/login';
  const loginLabel = isPro ? 'Pro Login' : 'Log In';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center">
          <Logo width={148} height={36} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {isPro ? <ProNav /> : <ConsumerNav />}
        </nav>

        {/* Desktop CTA area */}
        {!hideLogin && (
          <div className="hidden md:flex items-center gap-2">
            {/* Cross-audience toggle */}
            {isPro ? null : (
              <Link
                href="/pros"
                className="text-xs font-semibold border border-slate-300 rounded-full px-3 py-1 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition"
              >
                For Pros
              </Link>
            )}
            {!hideLoginLink && (
              <Button asChild size="sm" variant="ghost" className="text-slate-600 hover:text-slate-900">
                <Link href={loginHref}>{loginLabel}</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link href={resolvedCtaHref}>{resolvedCta}</Link>
            </Button>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3">
          {isPro ? (
            <>
              <Link href="/pros#features" className="block text-sm font-medium text-slate-700 py-1" onClick={() => setMobileOpen(false)}>Features</Link>
              <Link href="/pros/pricing" className="block text-sm font-medium text-slate-700 py-1" onClick={() => setMobileOpen(false)}>Pricing</Link>
              <Link href="/" className="block text-sm font-medium text-slate-500 py-1" onClick={() => setMobileOpen(false)}>For Customers</Link>
            </>
          ) : (
            <>
              <Link href="/find-pros" className="block text-sm font-medium text-slate-700 py-1" onClick={() => setMobileOpen(false)}>Find Services</Link>
              <Link href="/categories" className="block text-sm font-medium text-slate-700 py-1" onClick={() => setMobileOpen(false)}>Categories</Link>
              <Link href="/how-it-works" className="block text-sm font-medium text-slate-700 py-1" onClick={() => setMobileOpen(false)}>How It Works</Link>
              <Link href="/pros" className="block text-sm font-medium text-slate-500 py-1" onClick={() => setMobileOpen(false)}>For Pros</Link>
            </>
          )}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href={loginHref}>{loginLabel}</Link>
            </Button>
            <Button asChild size="sm" className="w-full">
              <Link href={resolvedCtaHref}>{resolvedCta}</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
