'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Home, Phone, Calendar, MessageSquare, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, checkAuth, userRole } = useAuthStore();

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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">HandyCall</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavLink href="/dashboard" icon={<Home className="h-5 w-5" />}>
            Dashboard
          </NavLink>
          <NavLink href="/dashboard/calls" icon={<Phone className="h-5 w-5" />}>
            Calls
          </NavLink>
          <NavLink href="/dashboard/appointments" icon={<Calendar className="h-5 w-5" />}>
            Appointments
          </NavLink>
          <NavLink href="/dashboard/knowledge" icon={<MessageSquare className="h-5 w-5" />}>
            Knowledge Base
          </NavLink>
          <NavLink href="/dashboard/settings" icon={<Settings className="h-5 w-5" />}>
            Settings
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <span className="mr-3">{icon}</span>
      <span className="font-medium">{children}</span>
    </Link>
  );
}
