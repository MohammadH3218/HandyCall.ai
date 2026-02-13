'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, MessageSquareText, PhoneCall, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/portal/page-header';
import { Skeleton } from '@/components/ui/skeleton';

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

function toISODate(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(value?: string | number) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function statusLabel(status?: string) {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').toLowerCase();
}

export default function DashboardPage() {
  const { company, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const basePath = usePortalBasePath();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

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

  useEffect(() => {
    if (authLoading || !isAuthenticated || hasLoaded) return;
    setHasLoaded(true);
    void loadDashboardData();
    void loadChartData('week');
    void loadChartData('month');
  }, [authLoading, hasLoaded, isAuthenticated]);

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
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const buildDailySeries = (
    start: Date,
    end: Date,
    history: UsageMetric[],
    labelFormat: Intl.DateTimeFormatOptions
  ) => {
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
    if (!isAuthenticated || authLoading || chartLoading[range] || chartSeries[range].length > 0) return;
    setChartLoading((prev) => ({ ...prev, [range]: true }));

    try {
      if (range === 'year') {
        const end = new Date();
        const points: ChartPoint[] = [];

        for (let i = 11; i >= 0; i -= 1) {
          const monthStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
          const monthEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0);
          const res = await apiClient.getUsageMetrics(toISODate(monthStart), toISODate(monthEnd));
          const history = (res as any)?.history || [];
          const total = (history as UsageMetric[]).reduce((acc, item) => acc + Number(item?.calls_count || 0), 0);
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
    } finally {
      setChartLoading((prev) => ({ ...prev, [range]: false }));
    }
  };

  const bookingRate = useMemo(() => {
    if (!stats?.todayCalls || !stats.appointments) return 0;
    return Math.round((stats.appointments / stats.todayCalls) * 100);
  }, [stats]);

  const todayStats = [
    {
      label: 'Missed calls',
      value: stats?.pendingQuestions || 0,
      hint: 'Needs follow-up',
      icon: <PhoneCall className="h-4 w-4" />,
    },
    {
      label: 'New messages',
      value: stats?.newLeads || 0,
      hint: 'Inbound conversations',
      icon: <MessageSquareText className="h-4 w-4" />,
    },
    {
      label: 'Upcoming appointments',
      value: stats?.appointments || 0,
      hint: 'Scheduled today',
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      label: 'Booking rate',
      value: `${bookingRate}%`,
      hint: 'Calls to bookings',
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" subtitle="We could not load your dashboard right now." />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-3" onClick={() => void loadDashboardData()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`${company?.company_name || 'HandyCall'}  -  Today`}
        subtitle="A quick snapshot of calls, messages, and booking performance."
      />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {todayStats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">{item.label}</p>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-[#13161b] text-text-muted">
                      {item.icon}
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${basePath}/calls`}>View all calls</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : recentCalls.length ? (
              recentCalls.slice(0, 6).map((call) => (
                <Link
                  key={call.call_id}
                  href={`${basePath}/calls/${call.call_id}`}
                  className="flex items-center justify-between rounded-md border border-border bg-[#0f1115] px-3 py-2 transition-colors duration-standard ease-standard hover:border-[#313538]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {call.caller_name || call.caller_phone || 'Unknown caller'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(call.created_at)}  -  {formatDuration(call.duration)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {statusLabel(call.status)}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent calls yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming schedule</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${basePath}/appointments`}>Open calendar</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingAppointments.length ? (
              upcomingAppointments.slice(0, 5).map((apt) => (
                <div key={apt.appointment_id} className="rounded-md border border-border bg-[#0f1115] px-3 py-3">
                  <p className="text-sm font-medium text-foreground">{apt.contact_name || 'Appointment'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(apt.scheduled_time)}
                    {apt.service_type ? `  -  ${apt.service_type}` : ''}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Call activity</CardTitle>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as ChartRange[]).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={chartRange === range ? 'primary' : 'secondary'}
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
          {chartLoading[chartRange] ? (
            <Skeleton className="h-[260px] w-full" />
          ) : chartSeries[chartRange].length ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries[chartRange]}>
                  <defs>
                    <linearGradient id="callTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0090ff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0090ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,127,133,0.22)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#787f85' }} stroke="rgba(120,127,133,0.34)" />
                  <YAxis tick={{ fontSize: 11, fill: '#787f85' }} stroke="rgba(120,127,133,0.34)" allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: '#369eff', strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #313538',
                      background: '#13161b',
                      color: '#ecedee',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0090ff"
                    strokeWidth={2}
                    fill="url(#callTrendGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#0090ff', fill: '#0b0c0e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed border-border bg-[#0f1115] text-sm text-muted-foreground">
              No call activity yet for this period.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

