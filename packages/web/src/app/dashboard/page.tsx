'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, Calendar, AlertCircle } from 'lucide-react';

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back to {company?.company_name || 'HandyCall'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Today's Calls"
          value={isLoading ? '-' : stats?.todayCalls.toString() || '0'}
          icon={<Phone className="h-8 w-8 text-blue-600" />}
          description={stats?.todayCalls ? 'calls received today' : 'No calls yet today'}
          isLoading={isLoading}
        />
        <StatCard
          title="New Leads"
          value={isLoading ? '-' : stats?.newLeads.toString() || '0'}
          icon={<Users className="h-8 w-8 text-green-600" />}
          description={stats?.newLeads ? 'new contacts added' : 'Waiting for first lead'}
          isLoading={isLoading}
        />
        <StatCard
          title="Appointments"
          value={isLoading ? '-' : stats?.appointments.toString() || '0'}
          icon={<Calendar className="h-8 w-8 text-purple-600" />}
          description={stats?.appointments ? 'upcoming appointments' : 'No scheduled appointments'}
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Questions"
          value={isLoading ? '-' : stats?.pendingQuestions.toString() || '0'}
          icon={<AlertCircle className="h-8 w-8 text-orange-600" />}
          description={stats?.pendingQuestions ? 'need your attention' : 'No flagged questions'}
          isLoading={isLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
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
            ) : recentCalls.length > 0 ? (
              <div className="space-y-4">
                {recentCalls.map((call) => (
                  <div key={call.call_id} className="border-b border-gray-200 pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {call.caller_name || call.caller_phone}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {call.summary || 'No summary available'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{formatDuration(call.duration)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(call.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No calls yet. Your AI receptionist is ready to answer!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
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
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.appointment_id} className="border-b border-gray-200 pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{apt.contact_name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {apt.service_type || 'Appointment'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{apt.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(apt.scheduled_time)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
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
    <Card className="transition-all hover:shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-9 bg-gray-200 rounded w-16 mt-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24 mt-1"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              </>
            )}
          </div>
          <div className="flex-shrink-0">{icon}</div>
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
    <a
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
    >
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </a>
  );
}
