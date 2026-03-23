'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IconMenu2, IconX, IconChevronDown } from '@tabler/icons-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '../ui/logo';

type SiteHeaderVariant = 'default' | 'minimal' | 'pro';

type SiteHeaderProps = {
  variant?: SiteHeaderVariant;
  hideLogin?: boolean;
  hideLoginLink?: boolean;
};

const NAV_LINKS = [
  { href: '/pricing', label: { en: 'Pricing', ar: 'الأسعار' } },
];

function ProfileMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : user?.first_name
        ? user.first_name[0].toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : user?.email ?? 'Account';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:shadow"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="max-w-[120px] truncate">{displayName}</span>
        <IconChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} stroke={2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/customer/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/customer/dashboard/inbox"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Inbox
            </Link>
            <Link
              href="/customer/dashboard/bookings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Bookings
            </Link>
          </div>
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMinimal = variant === 'minimal';
  const { language, isArabic, setLanguage } = useMarketingLanguage();
  const { isAuthenticated, isLoading } = useAuthStore();

  const copy = isArabic
    ? {
        forPros: 'للمحترفين',
        signIn: 'تسجيل الدخول',
        signUp: 'إنشاء حساب',
        findAPro: 'اعثر على محترف',
        toggleLabel: 'English',
        toggleAria: 'التبديل إلى الإنجليزية',
        menuAria: 'فتح القائمة',
      }
    : {
        forPros: 'For Pros',
        signIn: 'Log In',
        signUp: 'Sign Up',
        findAPro: 'Find a Pro',
        toggleLabel: 'العربية',
        toggleAria: 'Switch to Arabic',
        menuAria: 'Toggle menu',
      };

  const handleLanguageToggle = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5">
        <Link href="/" className="flex shrink-0 items-center">
          <Logo width={140} height={34} />
        </Link>

        {!isMinimal && (
          <nav className="hidden flex-1 items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label[language]}
              </Link>
            ))}
          </nav>
        )}

        {!hideLogin && (
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />

            {/* Auth area: profile or sign up/login */}
            {!isLoading && isAuthenticated ? (
              <ProfileMenu />
            ) : (
              <>
                {!hideLoginLink && (
                  <>
                    <Link
                      href="/login"
                      className="px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
                    >
                      {copy.signIn}
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      {copy.signUp}
                    </Link>
                  </>
                )}

                <span className="mx-1 h-4 border-l border-slate-200" />

                <Link
                  href="/register?audience=pro"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {copy.forPros}
                </Link>
              </>
            )}
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
        <div className="space-y-1 border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="mb-2 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {copy.toggleLabel}
          </button>

          {!isMinimal &&
            NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label[language]}
              </Link>
            ))}

          <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
            {!isLoading && isAuthenticated ? (
              <>
                <Link
                  href="/customer/dashboard"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/customer/dashboard/inbox"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Inbox
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register?audience=pro"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {copy.forPros}
                </Link>

                {!hideLogin && (
                  <>
                    {!hideLoginLink && (
                      <Link
                        href="/login"
                        className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setMobileOpen(false)}
                      >
                        {copy.signIn}
                      </Link>
                    )}
                    <Link
                      href="/register"
                      className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                      onClick={() => setMobileOpen(false)}
                    >
                      {copy.signUp}
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
