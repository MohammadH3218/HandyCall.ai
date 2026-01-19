'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

type CalendarProvider = 'GOOGLE' | 'MICROSOFT' | 'APPLE';

function hasWorkingHours(hours: any): boolean {
  if (!hours || typeof hours !== 'object') return false;
  return Object.values(hours).some((day: any) => {
    if (!day || day.closed) return false;
    const segments = Array.isArray(day.segments) ? day.segments : [];
    if (segments.length) return segments.some((s: any) => s?.open && s?.close);
    return !!(day.open && day.close);
  });
}

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { company } = useAuthStore();
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [isSavingCalendarMode, setIsSavingCalendarMode] = useState(false);
  const [isCalendarProviderDialogOpen, setIsCalendarProviderDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [showAppleForm, setShowAppleForm] = useState(false);
  const [appleEmail, setAppleEmail] = useState('');
  const [applePassword, setApplePassword] = useState('');

  const hasActiveSubscription = Boolean(
    company?.subscription_plan ||
      company?.stripe_subscription_id ||
      (company?.subscription_status &&
        (company.subscription_status === 'ACTIVE' || company.subscription_status === 'TRIALING')) ||
      (company?.trial_ends_at && company.trial_ends_at > Date.now())
  );

  const calendarComplete = company?.calendar_setup_completed === true;
  const scheduleComplete = Boolean(company?.timezone) && hasWorkingHours(company?.business_hours);
  const knowledgeComplete = (knowledgeCount ?? 0) > 0;

  const completedCount = useMemo(() => {
    const steps = [hasActiveSubscription, calendarComplete, scheduleComplete, knowledgeComplete];
    return steps.filter(Boolean).length;
  }, [hasActiveSubscription, calendarComplete, scheduleComplete, knowledgeComplete]);

  useEffect(() => {
    const loadKnowledge = async () => {
      setIsLoadingKnowledge(true);
      try {
        const data = await apiClient.getKnowledgeItems(undefined, undefined, 50);
        const items = data?.items || [];
        setKnowledgeCount(items.length);
      } catch (err: any) {
        console.error('Failed to load knowledge items:', err);
        setKnowledgeCount(0);
      } finally {
        setIsLoadingKnowledge(false);
      }
    };
    void loadKnowledge();
  }, []);

  const handleUseInternalCalendar = async () => {
    if (!company) return;
    setIsSavingCalendarMode(true);
    try {
      await apiClient.updateMyCompany({
        calendar_mode: 'INTERNAL',
        calendar_provider: 'NONE',
        calendar_setup_completed: true,
      });
      toast({
        title: 'Calendar ready',
        description: 'HandyCall calendar is now active for this account.',
      });
      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Calendar update failed',
        description: err?.message || 'Failed to update calendar settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCalendarMode(false);
    }
  };

  const handleConnectExternalCalendar = async () => {
    if (!selectedProvider) {
      toast({
        title: 'Choose a provider',
        description: 'Select a calendar provider before connecting.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedProvider === 'APPLE') {
      setShowAppleForm(true);
      return;
    }

    try {
      const res =
        selectedProvider === 'GOOGLE'
          ? await apiClient.getGoogleCalendarAuthUrl()
          : await apiClient.getMicrosoftCalendarAuthUrl();
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      toast({
        title: 'Calendar connection failed',
        description: err?.message || 'Unable to start calendar connection.',
        variant: 'destructive',
      });
    }
  };

  const handleConnectApple = async () => {
    try {
      await apiClient.connectAppleCalendar(appleEmail, applePassword);
      toast({
        title: 'Apple Calendar connected',
        description: 'Your calendar is now synced.',
      });
      setIsCalendarProviderDialogOpen(false);
      setShowAppleForm(false);
      setAppleEmail('');
      setApplePassword('');
      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Apple Calendar failed',
        description: err?.message || 'Unable to connect Apple Calendar.',
        variant: 'destructive',
      });
    }
  };

  const calendarStatusLabel = company?.calendar_provider && company.calendar_provider !== 'NONE'
    ? `Connected to ${company.calendar_provider}`
    : calendarComplete
      ? 'HandyCall calendar active'
      : 'Not set up yet';

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account setup</h1>
        <p className="mt-2 text-gray-600">
          Complete the steps below so the AI can schedule appointments using your exact working hours and calendar.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
            {completedCount} / 4 steps complete
          </Badge>
          {completedCount === 4 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              You are fully set up.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              Finish setup to enable reliable booking and scheduling.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Billing & plan
            </CardTitle>
            <CardDescription>Choose a plan and add a payment method to activate services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={hasActiveSubscription ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                {hasActiveSubscription ? 'Active' : 'Needs plan'}
              </Badge>
              {company?.subscription_plan && (
                <span className="text-sm text-gray-700">Plan: {company.subscription_plan}</span>
              )}
              {company?.subscription_status && (
                <span className="text-sm text-gray-500">Status: {company.subscription_status}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/billing/plans">Choose plan</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/billing/payment-method">Add payment method</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Calendar connection
            </CardTitle>
            <CardDescription>Pick how appointments are managed for this company.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={calendarComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                {calendarComplete ? 'Configured' : 'Needs setup'}
              </Badge>
              <span className="text-sm text-gray-700">{calendarStatusLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleUseInternalCalendar} disabled={isSavingCalendarMode}>
                {isSavingCalendarMode ? 'Saving...' : 'Use HandyCall calendar'}
              </Button>
              <Button variant="outline" onClick={() => setIsCalendarProviderDialogOpen(true)}>
                Connect external calendar
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/dashboard/appointments">Manage in Appointments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Working hours & timezone
            </CardTitle>
            <CardDescription>Set the hours the AI should offer to callers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={scheduleComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                {scheduleComplete ? 'Configured' : 'Needs schedule'}
              </Badge>
              <span className="text-sm text-gray-700">
                Timezone: {company?.timezone || 'Not set yet'}
              </span>
              <span className="text-sm text-gray-500">
                {hasWorkingHours(company?.business_hours) ? 'Working hours saved' : 'Working hours missing'}
              </span>
            </div>
            <Button asChild>
              <Link href="/dashboard/appointments?calendarSettings=1">Set working hours</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Knowledge base
            </CardTitle>
            <CardDescription>Add FAQs, pricing, service details, and policies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={knowledgeComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}>
                {knowledgeComplete ? 'Ready' : 'Needs content'}
              </Badge>
              <span className="text-sm text-gray-700">
                {isLoadingKnowledge ? 'Checking knowledge items...' : `${knowledgeCount ?? 0} items`}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Add service overviews, pricing, booking rules, and common objections so the AI answers naturally.
            </div>
            <Button asChild>
              <Link href="/dashboard/knowledge">Add knowledge</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCalendarProviderDialogOpen} onOpenChange={setIsCalendarProviderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <button
              className={`w-full border rounded-lg p-4 text-left hover:border-blue-500 transition ${
                selectedProvider === 'GOOGLE' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedProvider('GOOGLE')}
            >
              <div className="font-semibold text-gray-900">Google Calendar</div>
              <div className="text-sm text-gray-600 mt-1">Connect your Google/Gmail calendar</div>
            </button>
            <button
              className={`w-full border rounded-lg p-4 text-left hover:border-blue-500 transition ${
                selectedProvider === 'MICROSOFT' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedProvider('MICROSOFT')}
            >
              <div className="font-semibold text-gray-900">Outlook / Microsoft 365</div>
              <div className="text-sm text-gray-600 mt-1">Connect your Outlook or Microsoft calendar</div>
            </button>
            <button
              className={`w-full border rounded-lg p-4 text-left hover:border-blue-500 transition ${
                selectedProvider === 'APPLE' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedProvider('APPLE')}
            >
              <div className="font-semibold text-gray-900">Apple iCloud Calendar</div>
              <div className="text-sm text-gray-600 mt-1">Connect your iCloud calendar using an app-specific password</div>
            </button>
          </div>

          {showAppleForm ? (
            <div className="space-y-4 mt-4 border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">Create an app-specific password</div>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to appleid.apple.com</li>
                  <li>Sign in with your Apple ID</li>
                  <li>Open App-Specific Passwords</li>
                  <li>Generate a new password labeled HandyCall</li>
                </ol>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="apple-email">Apple ID Email</Label>
                  <Input
                    id="apple-email"
                    type="email"
                    value={appleEmail}
                    onChange={(e) => setAppleEmail(e.target.value)}
                    placeholder="your.email@icloud.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="apple-password">App-Specific Password</Label>
                  <Input
                    id="apple-password"
                    type="password"
                    value={applePassword}
                    onChange={(e) => setApplePassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAppleForm(false);
                    setAppleEmail('');
                    setApplePassword('');
                  }}
                >
                  Back
                </Button>
                <Button onClick={handleConnectApple} disabled={!appleEmail || !applePassword}>
                  Connect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsCalendarProviderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnectExternalCalendar} disabled={!selectedProvider}>
                Connect
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
