'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, Home, Menu, MessageSquare, RefreshCw, Settings, X } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/portal', label: 'Home', icon: <Home className="h-5 w-5" />, exact: true },
    { href: '/portal/bookings', label: 'My Bookings', icon: <Calendar className="h-5 w-5" /> },
    { href: '/portal/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
    { href: '/portal/subscriptions', label: 'Subscriptions', icon: <RefreshCw className="h-5 w-5" /> },
    { href: '/portal/payments', label: 'Payment History', icon: <CreditCard className="h-5 w-5" /> },
    { href: '/portal/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {open && (
        <div
          className="fixed inset-0 bg-foreground/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50
          h-screen w-64 bg-white border-r border-border/60 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="lg:hidden absolute top-4 right-4">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 w-8 p-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 border-b border-border/60">
          <Logo variant="words" width={140} height={32} />
          <p className="mt-1 text-xs text-muted-foreground font-medium">Customer Portal</p>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                    : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
                }`}
              >
                <span className={`mr-3 ${active ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-emerald-600'}`}>
                  {link.icon}
                </span>
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/60">
          <Link
            href="/find-pros"
            className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Find Service Pros
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border/60 bg-white px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
