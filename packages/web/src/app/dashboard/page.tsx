'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Users, Calendar, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DashboardStats {
  todayCalls: number;
  newLeads: number;
  appointments: number;
  pendingQuestions: number;
}

interface RecentCall {
  call_id: string;
  caller_phone: string;
  caller_name?: string;
  created_at: string;
  duration?: number;
  status: string;
  summary?: string;
}

interface UpcomingAppointment {
  appointment_id: string;
  contact_name: string;
  contact_phone: string;
  scheduled_time: string;
  service_type?: string;
  status: string;
}

interface UsageMetric {
  date: string;
  calls_count?: number;
}

type ChartRange = 'week' | 'month' | 'year';

interface ChartPoint {
  label: string;
  value: number;
}

export default function DashboardPage() {
  const { company } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>('week');
  const [chartSeries, setChartSeries] = useState<Record<ChartRange, ChartPoint[]>>({
    week: [],
    month: [],
    year: [],
  });
  const [chartLoading, setChartLoading] = useState<Record<ChartRange, boolean>>({
    week: false,
    month: false,
    year: false,
  });
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    void loadChartData('week');
    void loadChartData('month');
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsData, callsData, appointmentsData] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getRecentCalls(),
        apiClient.getUpcomingAppointments(),
      ]);

      setStats(statsData);
      setRecentCalls(callsData || []);
      setUpcomingAppointments(appointmentsData || []);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const toISODate = (date: Date) => date.toISOString().split('T')[0];

  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const buildDailySeries = (start: Date, end: Date, history: UsageMetric[], labelFormat: Intl.DateTimeFormatOptions) => {
    const map = new Map<string, number>();
    history.forEach((item) => {
      if (!item?.date) return;
      map.set(item.date, Number(item.calls_count || 0));
    });

    const series: ChartPoint[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      const key = toISODate(cursor);
      const label = cursor.toLocaleDateString('en-US', labelFormat);
      series.push({ label, value: map.get(key) ?? 0 });
      cursor = addDays(cursor, 1);
    }
    return series;
  };

  const loadChartData = async (range: ChartRange) => {
    if (chartLoading[range]) return;
    if (chartSeries[range]?.length) return;

    setChartLoading((prev) => ({ ...prev, [range]: true }));
    setChartError(null);

    try {
      if (range === 'year') {
        const end = new Date();
        const points: ChartPoint[] = [];
        for (let i = 11; i >= 0; i -= 1) {
          const monthStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
          const monthEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0);
          const res = await apiClient.getUsageMetrics(toISODate(monthStart), toISODate(monthEnd));
          const history = (res as any)?.history || [];
          const total = (history as UsageMetric[]).reduce(
            (acc, item) => acc + Number(item?.calls_count || 0),
            0
          );
          points.push({
            label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
            value: total,
          });
        }
        setChartSeries((prev) => ({ ...prev, year: points }));
        return;
      }

      const end = new Date();
      const start = range === 'week' ? addDays(end, -6) : addDays(end, -29);
      const res = await apiClient.getUsageMetrics(toISODate(start), toISODate(end));
      const history = (res as any)?.history || [];
      const format: Intl.DateTimeFormatOptions =
        range === 'week' ? { weekday: 'short' } : { month: 'short', day: 'numeric' };
      const series = buildDailySeries(start, end, history, format);
      setChartSeries((prev) => ({ ...prev, [range]: series }));
    } catch (err: any) {
      setChartError(err?.message || 'Unable to load call activity.');
    } finally {
      setChartLoading((prev) => ({ ...prev, [range]: false }));
    }
  };

  const formatDate = (dateValue?: string | number) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateValue?: string | number) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').toLowerCase();
  };

  const recentLimit = 2;
  const appointmentLimit = 2;
  const recentPreview = useMemo(() => recentCalls.slice(0, recentLimit), [recentCalls]);
  const appointmentPreview = useMemo(
    () => upcomingAppointments.slice(0, appointmentLimit),
    [upcomingAppointments]
  );
  const hasMoreCalls = recentCalls.length > recentLimit;
  const hasMoreAppointments = upcomingAppointments.length > appointmentLimit;

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Overview</p>
          <h1 className="text-3xl font-semibold text-foreground">
            Welcome back, {company?.company_name || 'HandyCall'}
          </h1>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Today's Calls"
          value={isLoading ? '-' : stats?.todayCalls.toString() || '0'}
          icon={<Phone className="h-8 w-8 text-emerald-600" />}
          description={stats?.todayCalls ? 'calls received today' : 'No calls yet today'}
          isLoading={isLoading}
        />
        <StatCard
          title="New Leads"
          value={isLoading ? '-' : stats?.newLeads.toString() || '0'}
          icon={<Users className="h-8 w-8 text-emerald-500" />}
          description={stats?.newLeads ? 'new contacts added' : 'Waiting for first lead'}
          isLoading={isLoading}
        />
        <StatCard
          title="Appointments"
          value={isLoading ? '-' : stats?.appointments.toString() || '0'}
          icon={<Calendar className="h-8 w-8 text-emerald-600" />}
          description={stats?.appointments ? 'upcoming appointments' : 'No scheduled appointments'}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Questions"
          value={isLoading ? '-' : stats?.pendingQuestions.toString() || '0'}
          icon={<AlertCircle className="h-8 w-8 text-amber-600" />}
          description={stats?.pendingQuestions ? 'need your attention' : 'No flagged questions'}
          isLoading={isLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Calls</CardTitle>
            {hasMoreCalls && (
              <Link
                href="/dashboard/calls"
                className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-600"
              >
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentPreview.length > 0 ? (
              <div className="space-y-2">
                {recentPreview.map((call) => (
                  <Link
                    key={call.call_id}
                    href={`/dashboard/calls/${call.call_id}`}
                    className="group block rounded-2xl border border-border/60 bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {call.caller_name || call.caller_phone || 'Unknown caller'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {(call.caller_phone && call.caller_name ? call.caller_phone : undefined) ||
                            call.summary?.trim() ||
                            `Status: ${formatStatus(call.status)}`}
                        </p>
                        {call.summary?.trim() && (
                          <p className="mt-2 text-xs text-muted-foreground/80">
                            {call.summary.length > 120 ? `${call.summary.slice(0, 120)}…` : call.summary}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">{formatDuration(call.duration)}</p>
                        <p className="mt-1">{formatDate(call.created_at)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No calls yet. Your AI receptionist is ready to answer!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            {hasMoreAppointments && (
              <Link
                href="/dashboard/appointments"
                className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-600"
              >
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : appointmentPreview.length > 0 ? (
              <div className="space-y-2">
                {appointmentPreview.map((apt) => {
                  const scheduled = (apt as any)?.scheduled_start ?? apt.scheduled_time;
                  return (
                    <Link
                      key={apt.appointment_id}
                      href="/dashboard/appointments"
                      className="group block rounded-2xl border border-border/60 bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {apt.contact_name || 'Upcoming appointment'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(scheduled)}
                          </p>
                          {apt.contact_phone && (
                            <p className="mt-2 text-xs text-muted-foreground/80">{apt.contact_phone}</p>
                          )}
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                          {formatStatus(apt.status)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No appointments scheduled
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Activity Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Call activity</CardTitle>
            <p className="text-sm text-muted-foreground">Total calls over time by period.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['week', 'month', 'year'] as ChartRange[]).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={chartRange === range ? 'default' : 'outline'}
                onClick={() => {
                  setChartRange(range);
                  void loadChartData(range);
                }}
              >
                {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {chartError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {chartError}
            </div>
          ) : chartLoading[chartRange] ? (
            <div className="h-[260px] animate-pulse rounded-2xl bg-emerald-50/60" />
          ) : chartSeries[chartRange].length === 0 ? (
            <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/40 text-sm text-muted-foreground">
              No call activity yet for this period.
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries[chartRange]}>
                  <defs>
                    <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                    }}
                    labelStyle={{ fontSize: 12, color: '#64748b' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#callsGradient)"
                    name="Calls"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  isLoading,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="group">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-9 bg-gray-200 rounded w-16 mt-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24 mt-1"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-semibold text-foreground mt-2">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </>
            )}
          </div>
          <div className="flex-shrink-0 rounded-2xl bg-emerald-50/70 p-3 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

