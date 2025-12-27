'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Button } from '@/components/ui/button';
import { Home, Phone, Calendar, MessageSquare, Settings, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth, userRole, company } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && userRole === 'admin') {
      // Redirect admins to admin dashboard
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, userRole, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-card border-r border-border flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <div className="lg:hidden absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 flex items-center justify-center border-b border-border">
          <Logo variant="words" width={160} height={40} />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavLink href="/dashboard" icon={<Home className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink href="/dashboard/calls" icon={<Phone className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
            Calls
          </NavLink>
          <NavLink href="/dashboard/appointments" icon={<Calendar className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
            Appointments
          </NavLink>
          <NavLink href="/dashboard/knowledge" icon={<MessageSquare className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
            Knowledge Base
          </NavLink>
          <NavLink href="/dashboard/settings" icon={<Settings className="h-5 w-5" />} onClick={() => setSidebarOpen(false)}>
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t border-border">
          <ProfileDropdown />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Company Name and Mobile Menu */}
        <header className="bg-card border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-10 w-10 p-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Company Name */}
          {company?.company_name && (
            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg lg:text-xl font-semibold text-foreground truncate">
                {company.company_name}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Dashboard</p>
            </div>
          )}

          {/* Desktop Profile Dropdown */}
          <div className="hidden lg:block">
            <ProfileDropdown />
          </div>

          {/* Mobile Profile Icon */}
          <div className="lg:hidden">
            <ProfileDropdown />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  onClick
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-secondary transition-all duration-200 hover:translate-x-1 group"
    >
      <span className="mr-3 transition-colors duration-200 group-hover:text-primary">{icon}</span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
