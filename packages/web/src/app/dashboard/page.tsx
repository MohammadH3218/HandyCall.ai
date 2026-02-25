'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/portal/page-header';
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
  const { company, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const basePath = usePortalBasePath();
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
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated || hasLoaded) return;
    setHasLoaded(true);
    loadDashboardData();
    void loadChartData('week');
    void loadChartData('month');
  }, [authLoading, isAuthenticated, hasLoaded]);

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
      if (!isAuthenticated || authLoading) {
        return;
      }
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
    if (!isAuthenticated || authLoading) return;
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
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${company?.company_name || 'HandyCall'}`}
        subtitle="See today's call activity, new leads, and upcoming appointments at a glance."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Calls"
          value={isLoading ? '-' : stats?.todayCalls.toString() || '0'}
          icon={<Phone className="h-5 w-5 text-emerald-600" />}
          description={stats?.todayCalls ? 'calls received today' : 'No calls yet today'}
          isLoading={isLoading}
        />
        <StatCard
          title="New Leads"
          value={isLoading ? '-' : stats?.newLeads.toString() || '0'}
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          description={stats?.newLeads ? 'new contacts added' : 'Waiting for first lead'}
          isLoading={isLoading}
        />
        <StatCard
          title="Appointments"
          value={isLoading ? '-' : stats?.appointments.toString() || '0'}
          icon={<Calendar className="h-5 w-5 text-emerald-600" />}
          description={stats?.appointments ? 'upcoming appointments' : 'No scheduled appointments'}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Questions"
          value={isLoading ? '-' : stats?.pendingQuestions.toString() || '0'}
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
          description={stats?.pendingQuestions ? 'need your attention' : 'No flagged questions'}
          isLoading={isLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Calls */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent Calls</h3>
            {hasMoreCalls && (
              <Link
                href={`${basePath}/calls`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-600"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPreview.length > 0 ? (
            <div className="space-y-2">
              {recentPreview.map((call) => {
                const status = call.status?.toString().toLowerCase();
                const isInProgress = status === 'in_progress' || status === 'in progress';
                const hasName = Boolean(call.caller_name && call.caller_name.trim());
                const displayName = isInProgress
                  ? 'In Progress'
                  : hasName
                    ? call.caller_name!.trim()
                    : 'Unknown caller';
                const initials = hasName
                  ? (() => {
                      const parts = call.caller_name!.trim().split(/\s+/);
                      return parts.length >= 2
                        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                        : call.caller_name![0].toUpperCase();
                    })()
                  : '#';
                const meta = [formatDate(call.created_at), call.duration ? formatDuration(call.duration) : null]
                  .filter(Boolean).join(' · ');
                return (
                  <Link
                    key={call.call_id}
                    href={`${basePath}/calls/${call.call_id}`}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-all hover:border-emerald-100 hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-400">{meta || '-'}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-500" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">
              No calls yet. Your AI receptionist is ready!
            </p>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming Appointments</h3>
            {hasMoreAppointments && (
              <Link
                href={`${basePath}/appointments`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-600"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : appointmentPreview.length > 0 ? (
            <div className="space-y-2">
              {appointmentPreview.map((apt) => {
                const scheduled = (apt as any)?.scheduled_start ?? apt.scheduled_time;
                const meta = formatDateTime(scheduled);
                const service = apt.service_type || null;
                return (
                  <Link
                    key={apt.appointment_id}
                    href={`${basePath}/appointments`}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-all hover:border-emerald-100 hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {apt.contact_name || service || 'Appointment'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {meta}{service ? ` · ${service}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {formatStatus(apt.status)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">
              No appointments scheduled
            </p>
          )}
        </div>
      </div>

      {/* Call Activity Chart */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Call activity</h3>
            <p className="mt-0.5 text-xs text-slate-500">Total inbound calls by period</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-1">
            {(['week', 'month', 'year'] as ChartRange[]).map((range) => (
              <button
                key={range}
                onClick={() => { setChartRange(range); void loadChartData(range); }}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  chartRange === range
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>
        </div>

        {chartError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {chartError}
          </div>
        ) : chartLoading[chartRange] ? (
          <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100/60" />
        ) : chartSeries[chartRange].length === 0 ? (
          <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 text-sm text-slate-400">
            No call activity yet for this period.
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSeries[chartRange]}>
                <defs>
                  <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip
                  cursor={{ stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#64748b', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#callsGradient)"
                  name="Calls"
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
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
    <div className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 transition-transform duration-200 group-hover:-translate-y-0.5">
          {icon}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          {isLoading ? (
            <div className="mt-2 animate-pulse">
              <div className="ml-auto h-8 w-16 rounded-lg bg-slate-100" />
              <div className="ml-auto mt-1.5 h-3 w-24 rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <p className="mt-1 text-[2rem] font-bold leading-none tracking-tight text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

