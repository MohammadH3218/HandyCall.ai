'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  IconLayoutDashboard,
  IconUser,
  IconUsers,
  IconCalendar,
  IconStar,
  IconChartBar,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: IconLayoutDashboard, exact: true },
  { href: '/admin/pros', label: 'Pros', icon: IconUser },
  { href: '/admin/customers', label: 'Customers', icon: IconUsers },
  { href: '/admin/bookings', label: 'Bookings', icon: IconCalendar },
  { href: '/admin/reviews', label: 'Reviews', icon: IconStar },
  { href: '/admin/analytics', label: 'Analytics', icon: IconChartBar },
  { href: '/admin/config', label: 'Config', icon: IconSettings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Skip auth guard on login page — layout wraps it but shouldn't block it
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) return;
    if (status === 'loading') return;
    const poolType = (session as any)?.poolType;
    if (status === 'unauthenticated' || poolType !== 'admin') {
      router.replace('/admin/login');
    }
  }, [status, session, router, isLoginPage]);

  // Login page: render without chrome
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-border/80 bg-white">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <span className="text-[17px] font-extrabold tracking-tight text-slate-900">
            Handy<span className="text-emerald-600">Call</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Admin
            </span>
          </span>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] ${active ? 'text-emerald-600' : 'text-slate-400'}`}
                      stroke={active ? 2 : 1.5}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border/60 p-3">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <IconLogout className="h-[18px] w-[18px]" stroke={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
