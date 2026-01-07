'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus } from 'lucide-react';
import { UserRole } from '@handycall/shared';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { AdminNav } from '@/components/admin/admin-nav';

interface User {
  user_id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  role: string;
  is_active: boolean;
  created_at: number;
  last_login_at?: number;
}

interface Company {
  company_id: string;
  company_name: string;
  status?: string;
  subscription_status?: string;
  cancel_at_period_end?: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const { userRole, isAuthenticated, isLoading } = useAuthStore();
  const { toast } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== UserRole.ADMIN)) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && userRole === UserRole.ADMIN) {
      loadData();
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  useEffect(() => {
    let filtered = users;

    if (selectedCompany !== 'all') {
      filtered = filtered.filter((user) => user.company_id === selectedCompany);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, selectedCompany, users]);

  const fetchWithFallback = async <T,>(proxyPath: string, directPath: string): Promise<T> => {
    let response = await fetch(proxyPath, { credentials: 'include' });

    if (response.status === 401) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Unauthorized. Please re-login as admin.');
      }
      response = await fetch(directPath, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ${proxyPath}`);
    }

    return response.json();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const usersData = await fetchWithFallback<User[]>('/api/proxy/users', `${apiBase}/users`);
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }

    try {
      const companiesData = await fetchWithFallback<Company[]>('/api/proxy/companies', `${apiBase}/companies`);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCompanyName = (user: User) => {
    if (user.company_id === 'platform-admin') {
      return 'Admin';
    }
    if (user.company_name) {
      return user.company_name;
    }
    const company = companies.find((c) => c.company_id === user.company_id);
    return company?.company_name || 'Unknown';
  };

  const getCompanyStatus = (user: User) => {
    const company = companies.find((c) => c.company_id === user.company_id);
    if (company?.cancel_at_period_end) {
      return 'Cancelled';
    }
    if (company?.status) {
      return company.status.charAt(0) + company.status.slice(1).toLowerCase();
    }
    if (company?.subscription_status) {
      const normalized = company.subscription_status.toUpperCase();
      if (normalized === 'TRIALING') return 'Trial';
      if (normalized === 'ACTIVE') return 'Active';
      if (normalized === 'CANCELED' || normalized === 'CANCELLED') return 'Cancelled';
      return 'Suspended';
    }
    return user.is_active ? 'Active' : 'Inactive';
  };

  const companyOptions =
    companies.length > 0
      ? companies
      : Array.from(
          users.reduce((map, user) => {
            if (user.company_id) {
              map.set(user.company_id, user.company_name || user.company_id);
            }
            return map;
          }, new Map<string, string>())
        ).map(([company_id, company_name]) => ({ company_id, company_name }));

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="hidden sm:block cursor-pointer" onClick={() => router.push('/admin')}>
                <Logo variant="words" width={160} height={40} />
              </div>
              <div className="sm:hidden cursor-pointer" onClick={() => router.push('/admin')}>
                <Logo variant="icon" width={40} height={40} />
              </div>
              <div className="border-l border-border pl-2 sm:pl-4 min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">Users</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Manage all users</p>
              </div>
            </div>
            <ProfileDropdown />
          </div>
          <div className="py-3 border-t border-border">
            <AdminNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">All Users</h2>
            <p className="text-muted-foreground">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Company</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm font-medium">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3 text-sm">{getCompanyName(user)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {getCompanyStatus(user)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/companies/${user.company_id}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => {
            setCreateOpen(false);
            loadData();
          }}
        />
      </main>
    </div>
  );
}
