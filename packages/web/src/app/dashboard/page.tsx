'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, Calendar, AlertCircle, ArrowUpRight } from 'lucide-react';

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

export default function DashboardPage() {
  const { company } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <div className="space-y-4">
                {recentPreview.map((call) => (
                  <div key={call.call_id} className="border-b border-border/60 pb-3 last:border-0">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {call.caller_name || call.caller_phone}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {call.summary?.trim() || 'No summary available'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDuration(call.duration)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-2">{formatDate(call.created_at)}</p>
                  </div>
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
              <div className="space-y-4">
                {appointmentPreview.map((apt) => (
                  <div key={apt.appointment_id} className="border-b border-border/60 pb-3 last:border-0">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-medium text-foreground">{apt.contact_name || 'Appointment'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {apt.service_type || 'Scheduled visit'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{apt.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-2">{formatDate(apt.scheduled_time)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No appointments scheduled
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <QuickAction
                title="Add Knowledge"
                description="Teach your AI about your services and policies"
                href="/dashboard/knowledge"
              />
              <QuickAction
                title="Configure Settings"
                description="Customize your business hours and AI behavior"
                href="/dashboard/settings"
              />
            </div>
          </CardContent>
        </Card>
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

function QuickAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between rounded-2xl border border-border/70 bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div>
        <h4 className="font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

