'use client';

import type { ElementType, ReactNode } from 'react';
import Link from 'next/link';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/ui/logo';
import { NotificationBell } from '@/components/notifications/notification-bell';

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: ElementType;
  exact?: boolean;
};

export type DashboardNavSection = {
  label?: string;
  items: DashboardNavItem[];
};

type DashboardSidebarProps = {
  sections: DashboardNavSection[];
  pathname: string;
  account: {
    name: string;
    email?: string | null;
    initials: string;
    detail?: string;
  };
  onSignOut: () => void;
  notificationHref: string;
  footerExtra?: ReactNode;
};

export function DashboardSidebar({
  sections,
  pathname,
  account,
  onSignOut,
  notificationHref,
  footerExtra,
}: DashboardSidebarProps) {
  const isActive = (item: DashboardNavItem) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href);

  return (
    <aside className="flex w-60 flex-col border-r border-border/80 bg-white">
      <div className="flex h-16 items-center border-b border-border/60 px-5">
        <Link href="/">
          <Logo width={120} height={30} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {sections.map((section, sectionIndex) => (
            <div key={section.label || sectionIndex} className="space-y-1">
              {section.label ? (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.label}
                </p>
              ) : null}
              <ul className="space-y-1">
                {section.items.map((item) => {
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
                          className={`h-4.5 w-4.5 ${
                            active ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                          stroke={active ? 2 : 1.5}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-border/60 p-3">
        {footerExtra}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-slate-900 text-[11px] font-semibold text-white">
                    {account.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800">
                    {account.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {account.detail || account.email}
                  </p>
                </div>
                <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" stroke={1.8} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{account.name}</p>
                  {account.email ? (
                    <p className="text-xs leading-none text-muted-foreground">{account.email}</p>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <IconLogout className="mr-2 h-4 w-4" stroke={1.7} />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NotificationBell side="top" align="end" viewAllHref={notificationHref} />
        </div>
      </div>
    </aside>
  );
}
