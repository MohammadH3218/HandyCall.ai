'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, Calendar, AlertCircle, MessageSquare, PhoneCall } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  todayCalls: number;
  newLeads: number;
  appointments: number;
  pendingQuestions: number;
}

interface UsageLimit {
  used: number;
  limit: number;
  percent: number;
  exceeded: boolean;
}

interface UsageLimits {
  minutes: UsageLimit;
  sms: UsageLimit;
  contacts: UsageLimit;
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
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callsEnabled, setCallsEnabled] = useState(
    company?.status === 'INACTIVE' || company?.status === 'SUSPENDED'
      ? false
      : (company?.calls_enabled ?? false)
  );
  const [smsEnabled, setSmsEnabled] = useState(
    company?.status === 'INACTIVE' || company?.status === 'SUSPENDED'
      ? false
      : (company?.sms_enabled ?? false)
  );
  const [toggleLoading, setToggleLoading] = useState<'calls' | 'sms' | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const servicesLocked = company?.status === 'INACTIVE' || company?.status === 'SUSPENDED';
  // Check if user has an active subscription plan or trial
  const hasActiveSubscription = Boolean(
    company?.subscription_plan || 
    company?.stripe_subscription_id || 
    (company?.subscription_status && (company.subscription_status === 'ACTIVE' || company.subscription_status === 'TRIALING')) ||
    (company?.trial_ends_at && company.trial_ends_at > Date.now())
  );

  useEffect(() => {
    if (company) {
      // Initialize service toggle states from company data
      const locked = company.status === 'INACTIVE' || company.status === 'SUSPENDED';
      setCallsEnabled(locked ? false : (company.calls_enabled ?? false));
      setSmsEnabled(locked ? false : (company.sms_enabled ?? false));
    }
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Auto-refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsData, callsData, appointmentsData, usageData] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getRecentCalls(),
        apiClient.getUpcomingAppointments(),
        apiClient.getUsageMetrics().catch(() => null),
      ]);

      setStats(statsData);
      setRecentCalls(callsData || []);
      setUpcomingAppointments(appointmentsData || []);
      const limits = (usageData as any)?.limits || null;
      setUsageLimits(limits);
      if (limits?.minutes?.exceeded) {
        setCallsEnabled(false);
      }
      if (limits?.sms?.exceeded) {
        setSmsEnabled(false);
      }
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

  const toggleService = async (service: 'calls' | 'sms', enabled: boolean) => {
    if (!company) return;
    if (company.status === 'INACTIVE' || company.status === 'SUSPENDED') {
      toast({
        title: 'Service unavailable',
        description: 'Services are disabled while the account is inactive or suspended.',
        variant: 'destructive',
      });
      return;
    }
    if (enabled) {
      const status = company.subscription_status;
      const canceling =
        company.cancel_at_period_end &&
        company.current_period_end &&
        company.current_period_end > Date.now();
      const hasPlan = Boolean(company.subscription_plan);
      const statusAllowed =
        !status || status === 'ACTIVE' || status === 'TRIALING' || canceling;
      if (!hasPlan) {
        toast({
          title: 'Plan required',
          description: 'Assign a subscription plan before enabling services.',
          variant: 'destructive',
        });
        return;
      }
      if (!statusAllowed) {
        toast({
          title: 'Subscription inactive',
          description: 'The subscription must be active to enable services.',
          variant: 'destructive',
        });
        return;
      }

      // Check usage limits
      if (service === 'calls' && usageLimits?.minutes?.exceeded) {
        toast({
          title: 'Call limit reached',
          description: 'You have used all call minutes for this billing period.',
          variant: 'destructive',
        });
        return;
      }

      if (service === 'sms' && usageLimits?.sms?.exceeded) {
        toast({
          title: 'SMS limit reached',
          description: 'You have used all SMS messages for this billing period.',
          variant: 'destructive',
        });
        return;
      }
    }
    setToggleLoading(service);
    try {
      const res = await fetch(`/api/proxy/companies/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [service === 'calls' ? 'calls_enabled' : 'sms_enabled']: enabled,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData?.message ||
            errorData?.error?.message ||
            'Failed to update service settings'
        );
      }

      if (service === 'calls') {
        setCallsEnabled(enabled);
      } else {
        setSmsEnabled(enabled);
      }

      toast({
        title: enabled ? `${service === 'calls' ? 'Calls' : 'SMS'} enabled` : `${service === 'calls' ? 'Calls' : 'SMS'} disabled`,
        description: enabled
          ? `Your AI receptionist will now handle ${service === 'calls' ? 'incoming calls' : 'incoming SMS messages'}`
          : `${service === 'calls' ? 'Call' : 'SMS'} handling is paused`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update service settings',
        variant: 'destructive',
      });
      if (service === 'calls') {
        setCallsEnabled(!enabled);
      } else {
        setSmsEnabled(!enabled);
      }
    } finally {
      setToggleLoading(null);
    }
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

      {/* Service Control Panel */}
      <Card className="mb-8 border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                Service Controls
              </h3>
              <p className="text-sm text-gray-600 mt-1">Enable or disable incoming calls and SMS</p>
            </div>
            <div className="flex gap-6">
              <ServiceToggle
                label="Calls"
                icon={<PhoneCall className="h-5 w-5" />}
                enabled={callsEnabled}
                loading={toggleLoading === 'calls'}
                disabled={servicesLocked || (!hasActiveSubscription && !callsEnabled)}
                onToggle={(enabled) => toggleService('calls', enabled)}
              />
              <ServiceToggle
                label="SMS"
                icon={<MessageSquare className="h-5 w-5" />}
                enabled={smsEnabled}
                loading={toggleLoading === 'sms'}
                disabled={servicesLocked || (!hasActiveSubscription && !smsEnabled)}
                onToggle={(enabled) => toggleService('sms', enabled)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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

function ServiceToggle({
  label,
  icon,
  enabled,
  loading,
  disabled,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  loading: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <div className={`transition-colors ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        disabled={loading || disabled}
        className={`
          relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ease-in-out
          ${enabled ? 'bg-green-500 shadow-lg shadow-green-200' : 'bg-gray-300 shadow-md'}
          ${loading || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`
            inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out
            ${enabled ? 'translate-x-7' : 'translate-x-1'}
            ${loading ? 'animate-pulse' : ''}
          `}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            </div>
          )}
        </span>
        {/* Animated background gradient */}
        {enabled && !loading && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse opacity-75"></div>
        )}
      </button>
      <span className={`text-xs font-semibold transition-colors ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
        {enabled ? 'Active' : 'Paused'}
      </span>
    </div>
  );
}
