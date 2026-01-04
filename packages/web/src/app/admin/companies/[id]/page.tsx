'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Phone, BarChart3 } from 'lucide-react';
import { UserRole } from '@handycall/shared';
import { AdminNav } from '@/components/admin/admin-nav';

interface Company {
  company_id: string;
  company_name: string;
  service_type: string;
  status: string;
  phone_number: string;
  email: string;
  timezone: string;
  created_at: number;
  subscription_tier?: string;
}

interface CompanyStats {
  total_calls: number;
  total_users: number;
  ai_handled_calls: number;
  ai_handled_percentage: number;
  total_contacts: number;
  total_appointments: number;
}

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: number;
  last_login_at?: number;
}

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { userRole, isAuthenticated, isLoading } = useAuthStore();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = params.id as string;

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== UserRole.ADMIN)) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && userRole === UserRole.ADMIN) {
      loadCompanyDetails();
    }
  }, [isAuthenticated, userRole, isLoading, router, companyId]);

  const loadCompanyDetails = async () => {
    setLoading(true);
    try {
      const [companyRes, statsRes, usersRes] = await Promise.all([
        fetch(`/api/proxy/companies/${companyId}`, { credentials: 'include' }),
        fetch(`/api/proxy/companies/${companyId}/stats`, { credentials: 'include' }),
        fetch(`/api/proxy/companies/${companyId}/users`, { credentials: 'include' }),
      ]);

      let companyResponse = companyRes;
      let statsResponse = statsRes;
      let usersResponse = usersRes;

      if (companyRes.status === 401 || statsRes.status === 401 || usersRes.status === 401) {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Unauthorized. Please re-login as admin.');
        }
        [companyResponse, statsResponse, usersResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
      }

      if (!companyResponse.ok || !statsResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to load company details');
      }

      const [companyData, statsData, usersData] = await Promise.all([
        companyResponse.json(),
        statsResponse.json(),
        usersResponse.json(),
      ]);

      setCompany(companyData);
      setStats(statsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load company details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company details',
        variant: 'destructive',
      });
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

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading || loading || !company || !stats) {
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
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/companies')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="border-l border-border pl-2 sm:pl-4 min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
                  {company.company_name}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Company Details</p>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_calls}</div>
              <p className="text-xs text-muted-foreground">
                {stats.ai_handled_percentage.toFixed(1)}% AI handled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">Active staff members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_contacts}</div>
              <p className="text-xs text-muted-foreground">Total contacts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointments</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_appointments}</div>
              <p className="text-xs text-muted-foreground">Scheduled appointments</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <Badge>{company.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Service Type:</span>
                  <span className="text-sm">{company.service_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Email:</span>
                  <span className="text-sm">{company.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                  <span className="text-sm">{company.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Timezone:</span>
                  <span className="text-sm">{company.timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <span className="text-sm">{formatDate(company.created_at)}</span>
                </div>
                {company.subscription_tier && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Subscription:</span>
                    <Badge variant="outline">{company.subscription_tier}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>{users.length} users</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                ) : (
                  users.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {user.is_active ? (
                          <Badge className="text-xs bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-800">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
