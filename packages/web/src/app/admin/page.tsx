'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/ui/logo';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, BarChart3 } from 'lucide-react';
import { UserRole } from '@handycall/shared';
import { AdminNav } from '@/components/admin/admin-nav';

interface AdminStats {
  totalRevenue: number;
  totalProfit: number;
  totalCompanies: number;
  totalSubscriptions: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  activeUsers: number;
}

interface Company {
  company_id: string;
  company_name: string;
  service_type: string;
  status: string;
  subscription_tier: string;
  created_at: number;
  revenue: number;
  subscription_count: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { userRole, isAuthenticated, isLoading } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== UserRole.ADMIN)) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && userRole === UserRole.ADMIN) {
      loadAdminData();
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  const loadAdminData = async () => {
    setIsLoadingStats(true);
    try {
      const [statsRes, companiesRes] = await Promise.all([
        fetch(`/api/proxy/admin/stats`, { credentials: 'include' }),
        fetch(`/api/proxy/admin/top-companies?limit=5`, { credentials: 'include' }),
      ]);

      let statsResponse = statsRes;
      let companiesResponse = companiesRes;

      // Fallback to direct API if proxy/session not authorized
      if (statsRes.status === 401 || companiesRes.status === 401) {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Unauthorized. Please re-login as admin.');
        }
        [statsResponse, companiesResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/top-companies?limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
      }

      if (statsResponse.ok && companiesResponse.ok) {
        const [statsData, companiesData] = await Promise.all([
          statsResponse.json(),
          companiesResponse.json(),
        ]);

        setStats({
          totalRevenue: statsData.total_revenue || 0,
          totalProfit: 0,
          totalCompanies: statsData.total_companies || 0,
          totalSubscriptions: 0,
          monthlyRevenue: 0,
          monthlyProfit: 0,
          activeUsers: statsData.total_users || 0,
        });

        setCompanies(companiesData.map((company: any) => ({
          company_id: company.company_id,
          company_name: company.company_name,
          service_type: company.service_type,
          status: company.status,
          subscription_tier: company.subscription_plan || company.subscription_tier || 'No Plan',
          created_at: company.created_at,
          revenue: 0,
          subscription_count: company.total_users || 0,
        })));
      } else {
        throw new Error('Failed to load admin data');
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCompanyStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (isLoading || isLoadingStats) {
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
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="hidden sm:block">
                <Logo variant="words" width={160} height={40} />
              </div>
              <div className="sm:hidden">
                <Logo variant="icon" width={40} height={40} />
              </div>
              <div className="border-l border-border pl-2 sm:pl-4 min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Platform Management</p>
              </div>
            </div>
            <ProfileDropdown />
          </div>
          <div className="py-3 border-t border-border">
            <AdminNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary"
            onClick={() => router.push('/admin/companies')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Manage Companies
              </CardTitle>
              <CardDescription>View and manage all companies</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary"
            onClick={() => router.push('/admin/users')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Users
              </CardTitle>
              <CardDescription>View and manage all users</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary"
            onClick={() => router.push('/dashboard')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics
              </CardTitle>
              <CardDescription>View system analytics</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground">All-time revenue</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats?.totalProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">After expenses</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCompanies || 0}</div>
              <p className="text-xs text-muted-foreground">Active companies</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSubscriptions || 0}</div>
              <p className="text-xs text-muted-foreground">Active subscriptions</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.monthlyRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(stats?.monthlyProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Current active users</p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalCompanies
                  ? formatCurrency((stats.totalRevenue || 0) / stats.totalCompanies)
                  : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">Per company</p>
            </CardContent>
          </Card>
        </div>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>Manage all companies on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground whitespace-nowrap">
                        Company Name
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground hidden md:table-cell">
                        Service Type
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground hidden lg:table-cell">Tier</th>
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground hidden sm:table-cell">
                        Revenue
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground hidden xl:table-cell">
                        Subscriptions
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground hidden lg:table-cell">
                        Created
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-sm font-medium text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {companies.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No companies found
                        </td>
                      </tr>
                    ) : (
                      companies.map((company) => (
                        <tr key={company.company_id} className="hover:bg-secondary transition-colors duration-150">
                          <td className="px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap">{company.company_name}</td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{company.service_type}</td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium transition-colors duration-150 ${
                                company.status === 'ACTIVE'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {formatCompanyStatus(company.status)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                            {company.subscription_tier}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm font-medium hidden sm:table-cell">
                            {formatCurrency(company.revenue)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                            {company.subscription_count}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                            {formatDate(company.created_at)}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <Button variant="outline" size="sm" className="transition-colors duration-200 whitespace-nowrap">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}













