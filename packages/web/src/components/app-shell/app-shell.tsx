'use client';

import Link from 'next/link';
import { Bell, Building2, Menu, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type AppNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export type AppNavGroup = {
  label?: string;
  items: AppNavItem[];
};

interface AppShellProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <main className="flex-1 overflow-auto px-6 py-6 md:px-8 xl:px-10">{children}</main>
      </div>
    </div>
  );
}

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  groups: AppNavGroup[];
  footer?: ReactNode;
}

export function AppSidebar({ open, onClose, companyName, groups, footer }: AppSidebarProps) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-border bg-[#0f1115] transition-transform duration-standard ease-standard lg:sticky lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-[#13161b] text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">HandyCall</p>
              <p className="truncate text-xs text-muted-foreground">{companyName || 'Organization'}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label || 'group'} className="space-y-1">
              {group.label ? (
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                  {group.label}
                </p>
              ) : null}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors duration-standard ease-standard',
                    item.active
                      ? 'border-primary/45 bg-primary/12 text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-[#13161b] hover:text-foreground'
                  )}
                >
                  {item.active ? <span className="absolute inset-y-1 left-0 w-[2px] rounded-r bg-primary" /> : null}
                  <span className={cn('text-text-faint', item.active ? 'text-primary' : 'group-hover:text-foreground')}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {footer ? <div className="border-t border-border px-3 py-3">{footer}</div> : null}
      </aside>
    </>
  );
}

interface AppTopBarProps {
  onMenuClick: () => void;
  statusLabel?: string;
  statusTone?: 'on' | 'off';
  rightSlot?: ReactNode;
}

export function AppTopBar({ onMenuClick, statusLabel = 'Routing active', statusTone = 'on', rightSlot }: AppTopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-4 w-4" />
      </Button>

      <div className="hidden md:block">
        <div className="relative w-[320px]">
          <Input
            leadingIcon={<Search className="h-4 w-4" />}
            placeholder="Search calls, messages, contacts..."
            aria-label="Global search"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-text-faint">
            ?K
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em]',
            statusTone === 'on'
              ? 'border-success/35 bg-success/15 text-success'
              : 'border-warning/35 bg-warning/10 text-warning'
          )}
        >
          {statusLabel}
        </span>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        {rightSlot}
      </div>
    </header>
  );
}

