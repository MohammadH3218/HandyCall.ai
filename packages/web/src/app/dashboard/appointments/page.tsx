'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, Plus, Pencil, Trash2, Settings, X } from 'lucide-react';

type TimeSegment = { open: string; close: string };
type DayScheduleDraft = { closed?: boolean; open?: string; close?: string; segments?: TimeSegment[] };
type BusinessHoursDraft = Record<string, DayScheduleDraft>;
type DateOverrideDraft = { date: string; closed?: boolean; segments?: TimeSegment[] };

const WEEKDAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

function normalizeDaySchedule(raw: any): DayScheduleDraft {
  if (!raw) return { closed: true, segments: [] };
  if (raw.closed) return { closed: true, segments: [] };
  const segs = Array.isArray(raw.segments)
    ? raw.segments
        .filter((s: any) => s?.open && s?.close)
        .map((s: any) => ({ open: String(s.open), close: String(s.close) }))
    : [];
  if (segs.length) return { closed: false, segments: segs };
  if (raw.open && raw.close) return { closed: false, segments: [{ open: String(raw.open), close: String(raw.close) }] };
  return { closed: true, segments: [] };
}

function normalizeBusinessHours(raw: any): BusinessHoursDraft {
  const out: BusinessHoursDraft = {};
  for (const { key } of WEEKDAYS) out[key] = normalizeDaySchedule(raw?.[key]);
  return out;
}

function normalizeOverrides(raw: any): DateOverrideDraft[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((o) => ({
        date: String(o?.date || ''),
        closed: !!o?.closed,
        segments: Array.isArray(o?.segments)
          ? o.segments
              .filter((s: any) => s?.open && s?.close)
              .map((s: any) => ({ open: String(s.open), close: String(s.close) }))
          : [],
      }))
      .filter((o) => !!o.date);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([date, o]: any) => ({
      date,
      closed: !!o?.closed,
      segments: Array.isArray(o?.segments)
        ? o.segments
            .filter((s: any) => s?.open && s?.close)
            .map((s: any) => ({ open: String(s.open), close: String(s.close) }))
        : [],
    }));
  }
  return [];
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(ts?: number | string) {
  if (!ts) return '—';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status?: string): { label: string; className: string } {
  const s = String(status || '').toUpperCase();
  if (s === 'SCHEDULED') return { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (s === 'CONFIRMED') return { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (s === 'CANCELLED') return { label: 'Cancelled', className: 'bg-gray-50 text-gray-700 border-gray-200' };
  if (s === 'COMPLETED') return { label: 'Completed', className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return { label: status || 'Unknown', className: 'bg-gray-50 text-gray-700 border-gray-200' };
}

export default function AppointmentsPage() {
  const [company, setCompany] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Day view state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);

  // Edit appointment state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any>({});

  // Delete confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calendar settings state
  const [isCalendarSettingsOpen, setIsCalendarSettingsOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDeleteCalendarConfirmOpen, setIsDeleteCalendarConfirmOpen] = useState(false);
  const [calendarTimezone, setCalendarTimezone] = useState('');
  const [businessHoursDraft, setBusinessHoursDraft] = useState<BusinessHoursDraft>(() => normalizeBusinessHours(null));
  const [dateOverridesDraft, setDateOverridesDraft] = useState<DateOverrideDraft[]>([]);

  // Show more appointments state
  const [showAllAppointments, setShowAllAppointments] = useState(false);

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupChoice, setSetupChoice] = useState<'INTERNAL' | 'EXTERNAL' | null>(null);
  const [setupTimezone, setSetupTimezone] = useState('');

  const [isCalendarProviderDialogOpen, setIsCalendarProviderDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'GOOGLE' | 'MICROSOFT' | 'APPLE' | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<any>({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    service_type: '',
    date: '',
    start_time: '09:00',
    duration_minutes: 60,
    notes: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    price: '',
    recurrence_enabled: false,
    recurrence_frequency: 'WEEKLY',
    recurrence_interval: 1,
    recurrence_count: 4,
  });

  const monthLabel = useMemo(
    () => monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [monthCursor]
  );

  const visibleRange = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }, [monthCursor]);

  const monthDays = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7)); // Monday
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [monthCursor]);

  const isCalendarSetupComplete = company?.calendar_setup_completed !== false;

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (appointments || [])
      .filter((a) => !a?.is_series_master)
      .filter((a) => {
        if (statusFilter === 'ALL') return true;
        return String(a?.status || '').toUpperCase() === statusFilter;
      })
      .filter((a) => {
        if (!q) return true;
        const text = [
          a?.contact_name,
          a?.contact_email,
          a?.contact_phone,
          a?.service_type,
          a?.notes,
          a?.address?.street,
          a?.address?.city,
          a?.address?.state,
          a?.address?.zip,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      })
      .sort((a, b) => (a?.scheduled_start ?? 0) - (b?.scheduled_start ?? 0));
  }, [appointments, searchQuery, statusFilter]);

  const apptsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of filteredAppointments) {
      const ms = typeof a?.scheduled_start === 'number' ? a.scheduled_start : Date.parse(a?.scheduled_start);
      if (!Number.isFinite(ms)) continue;
      const key = ymd(new Date(ms));
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [filteredAppointments]);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle calendar connection redirect
  useEffect(() => {
    const calendarStatus = searchParams?.get('calendar');
    const provider = searchParams?.get('provider');
    const errorMessage = searchParams?.get('message');

    if (calendarStatus === 'connected') {
      // Reload data to show synced calendar events
      void loadData();
      
      // Show success message
      const providerName = provider === 'google' ? 'Google Calendar' : 
                          provider === 'microsoft' ? 'Microsoft Calendar' : 
                          'Calendar';
      setError(null);
      
      // Clear URL parameters
      router.replace('/dashboard/appointments');
    } else if (calendarStatus === 'error') {
      setError(errorMessage || 'Failed to connect calendar');
      // Clear URL parameters
      router.replace('/dashboard/appointments');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCursor]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check calendar connection status first - this will auto-disconnect if permissions are revoked
      try {
        await apiClient.getCalendarConnectionStatus();
      } catch (err: any) {
        // Connection check failed - might have auto-disconnected, continue loading
        console.warn('Calendar connection check failed:', err);
      }
      
      const [c, a] = await Promise.all([
        apiClient.getMyCompany(),
        apiClient.getAppointmentsRange(visibleRange.start.toISOString(), visibleRange.end.toISOString()),
      ]);
      setCompany(c);
      setCalendarTimezone(c?.timezone || '');
      setBusinessHoursDraft(normalizeBusinessHours(c?.business_hours));
      setDateOverridesDraft(normalizeOverrides(c?.schedule_overrides));
      setSetupTimezone(c?.timezone || '');
      setAppointments(a.appointments || []);
    } catch (err: any) {
      console.error('Error loading appointments:', err);
      setError(err?.message || 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSetup = () => {
    setSetupChoice(null);
    setSetupTimezone(company?.timezone || '');
    setIsSetupOpen(true);
  };

  const handleCompleteSetup = async () => {
    if (!setupChoice) return;
    if (setupChoice === 'INTERNAL' && !setupTimezone) {
      setError('Please set your timezone first');
      return;
    }

    if (setupChoice === 'INTERNAL') {
      await apiClient.updateMyCompany({
        timezone: setupTimezone,
        calendar_mode: setupChoice,
        calendar_setup_completed: true,
        calendar_provider: 'NONE',
      });
      setIsSetupOpen(false);
      await loadData();
    } else {
      // EXTERNAL - redirect to OAuth flow
      setIsSetupOpen(false);
      setIsCalendarProviderDialogOpen(true);
    }
  };

  const handleViewAppointment = async (appointmentId: string) => {
    try {
      const appt = await apiClient.getAppointmentById(appointmentId);
      setSelectedAppointment(appt);
      setIsDetailsOpen(true);
    } catch (err: any) {
      console.error('Error loading appointment:', err);
      setError(err?.message || 'Failed to load appointment');
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const date = String(createDraft.date || '').trim();
      const start = String(createDraft.start_time || '').trim();
      if (!date || !start) {
        setError('Please choose a date and start time');
        return;
      }

      const duration = Math.max(10, Number(createDraft.duration_minutes) || 60);
      const startLocal = new Date(`${date}T${start}:00`);
      const startMs = startLocal.getTime();
      const endMs = startMs + duration * 60_000;

      const payload: any = {
        scheduled_start: startMs,
        scheduled_end: endMs,
        contact_name: createDraft.contact_name || undefined,
        contact_email: createDraft.contact_email || undefined,
        contact_phone: createDraft.contact_phone || undefined,
        service_type: createDraft.service_type || company?.service_type || 'Service',
        notes: createDraft.notes || undefined,
        address:
          createDraft.address_street || createDraft.address_city || createDraft.address_state || createDraft.address_zip
            ? {
                street: createDraft.address_street || undefined,
                city: createDraft.address_city || undefined,
                state: createDraft.address_state || undefined,
                zip: createDraft.address_zip || undefined,
              }
            : undefined,
        price_cents: createDraft.price ? Math.round(Number(createDraft.price) * 100) : undefined,
        currency: createDraft.price ? 'USD' : undefined,
        created_by: 'USER',
      };

      if (createDraft.recurrence_enabled) {
        payload.recurrence = {
          frequency: createDraft.recurrence_frequency,
          interval: Number(createDraft.recurrence_interval) || 1,
          count: Number(createDraft.recurrence_count) || 1,
        };
      }

      await apiClient.createAppointment(payload);

      setIsCreateOpen(false);
      setCreateDraft((p: any) => ({
        ...p,
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        notes: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        price: '',
        recurrence_enabled: false,
      }));
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create appointment');
    }
  };

  const [appleEmail, setAppleEmail] = useState('');
  const [applePassword, setApplePassword] = useState('');
  const [showAppleForm, setShowAppleForm] = useState(false);

  const handleConnectExternalCalendar = async () => {
    if (!selectedProvider) {
      setError('Please select a calendar provider');
      return;
    }

    try {
      setError(null);
      let response: any;

      if (selectedProvider === 'GOOGLE') {
        response = await apiClient.getGoogleCalendarAuthUrl();
        if (response?.url) {
          window.location.href = response.url;
        }
      } else if (selectedProvider === 'MICROSOFT') {
        response = await apiClient.getMicrosoftCalendarAuthUrl();
        if (response?.url) {
          window.location.href = response.url;
        }
      } else if (selectedProvider === 'APPLE') {
        // Show Apple form instead of redirecting
        setShowAppleForm(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect calendar');
    }
  };

  const handleConnectApple = async () => {
    if (!appleEmail || !applePassword) {
      setError('Please enter your Apple ID email and app-specific password');
      return;
    }

    try {
      setError(null);
      await apiClient.connectAppleCalendar(appleEmail, applePassword);
      setIsCalendarProviderDialogOpen(false);
      setShowAppleForm(false);
      setAppleEmail('');
      setApplePassword('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to connect Apple Calendar');
    }
  };

  // Check if external calendar is connected
  const isExternalCalendarConnected = company?.calendar_mode === 'EXTERNAL' && company?.calendar_provider && company?.calendar_provider !== 'NONE';

  // Get appointments for selected day
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return apptsByDay.get(selectedDate) ?? [];
  }, [selectedDate, apptsByDay]);

  // Format selected date for display
  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return '';
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [selectedDate]);

  // Handle opening edit dialog
  const handleEditAppointment = (appointment: any) => {
    const startDate = new Date(appointment.scheduled_start);
    const endDate = new Date(appointment.scheduled_end);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    setEditDraft({
      appointment_id: appointment.appointment_id,
      contact_name: appointment.contact_name || '',
      contact_email: appointment.contact_email || '',
      contact_phone: appointment.contact_phone || '',
      service_type: appointment.service_type || '',
      date: ymd(startDate),
      start_time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      duration_minutes: durationMinutes,
      notes: appointment.notes || '',
      address_street: appointment.address?.street || '',
      address_city: appointment.address?.city || '',
      address_state: appointment.address?.state || '',
      address_zip: appointment.address?.zip || '',
      price: appointment.price_cents ? (appointment.price_cents / 100).toString() : '',
      status: appointment.status || 'SCHEDULED',
    });
    setIsEditOpen(true);
    setIsDetailsOpen(false);
  };

  // Handle updating appointment
  const handleUpdateAppointment = async () => {
    try {
      setError(null);
      const date = String(editDraft.date || '').trim();
      const start = String(editDraft.start_time || '').trim();
      if (!date || !start) {
        setError('Please choose a date and start time');
        return;
      }

      const duration = Math.max(10, Number(editDraft.duration_minutes) || 60);
      const startLocal = new Date(`${date}T${start}:00`);
      const startMs = startLocal.getTime();
      const endMs = startMs + duration * 60_000;

      const payload: any = {
        scheduled_start: startMs,
        scheduled_end: endMs,
        contact_name: editDraft.contact_name || undefined,
        contact_email: editDraft.contact_email || undefined,
        contact_phone: editDraft.contact_phone || undefined,
        service_type: editDraft.service_type || company?.service_type || 'Service',
        notes: editDraft.notes || undefined,
        address:
          editDraft.address_street || editDraft.address_city || editDraft.address_state || editDraft.address_zip
            ? {
                street: editDraft.address_street || undefined,
                city: editDraft.address_city || undefined,
                state: editDraft.address_state || undefined,
                zip: editDraft.address_zip || undefined,
              }
            : undefined,
        price_cents: editDraft.price ? Math.round(Number(editDraft.price) * 100) : undefined,
        status: editDraft.status,
      };

      await apiClient.updateAppointment(editDraft.appointment_id, payload);
      setIsEditOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update appointment');
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (appointment: any) => {
    setAppointmentToDelete(appointment);
    setIsDeleteConfirmOpen(true);
    setIsDetailsOpen(false);
  };

  // Handle actual deletion
  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;

    try {
      setIsDeleting(true);
      setError(null);
      await apiClient.deleteAppointment(appointmentToDelete.appointment_id);
      setIsDeleteConfirmOpen(false);
      setAppointmentToDelete(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete appointment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle opening calendar settings
  const handleOpenCalendarSettings = () => {
    setCalendarTimezone(company?.timezone || '');
    setBusinessHoursDraft(normalizeBusinessHours(company?.business_hours));
    setDateOverridesDraft(normalizeOverrides(company?.schedule_overrides));
    setIsCalendarSettingsOpen(true);
  };

  // Handle saving calendar settings
  const handleSaveCalendarSettings = async () => {
    try {
      setError(null);

      const cleanedHours: any = {};
      for (const { key } of WEEKDAYS) {
        const day = businessHoursDraft[key] || {};
        const segs = Array.isArray(day.segments)
          ? day.segments.filter((s) => s?.open && s?.close)
          : [];
        cleanedHours[key] = segs.length ? { closed: false, segments: segs } : { closed: true };
      }

      const cleanedOverrides = (dateOverridesDraft || [])
        .map((o) => ({
          date: o.date,
          closed: !!o.closed,
          segments: Array.isArray(o.segments) ? o.segments.filter((s) => s?.open && s?.close) : [],
        }))
        .filter((o) => !!o.date)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

      const updates: any = {
        business_hours: cleanedHours,
        schedule_overrides: cleanedOverrides,
      };

      // Timezone is read-only if an external calendar is connected; use imported timezone.
      if (!isExternalCalendarConnected && calendarTimezone) {
        updates.timezone = calendarTimezone;
      }

      await apiClient.updateMyCompany(updates);
      setIsCalendarSettingsOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update settings');
    }
  };

  // Handle disconnecting calendar
  const handleDisconnectCalendar = async () => {
    try {
      setIsDisconnecting(true);
      setError(null);
      await apiClient.disconnectCalendar();
      setIsDeleteCalendarConfirmOpen(false);
      setIsCalendarSettingsOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to disconnect calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={loadData} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-2 text-gray-600">View and manage your schedule</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} disabled={!isCalendarSetupComplete}>
          <Plus className="h-4 w-4 mr-2" />
          New appointment
        </Button>
      </div>

      {!isCalendarSetupComplete ? (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">Set up your appointments calendar</div>
                <div className="text-sm text-gray-600 mt-1">
                  New accounts start here. Choose your timezone and how you want to manage scheduling.
                </div>
              </div>
              <Button onClick={handleStartSetup}>Set up</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isCalendarSetupComplete ? (
        <>
        {/* Search, Filters, and Connect Calendar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
                <Input
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
                />
                <select
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <div className="text-sm text-gray-500">
                  {isLoading ? 'Loading...' : `${filteredAppointments.length} appointments`}
                </div>
              </div>
              {isExternalCalendarConnected ? (
                <Button variant="outline" onClick={handleOpenCalendarSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Calendar Settings
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setIsCalendarProviderDialogOpen(true)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calendar - Full Width */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                {monthLabel}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonthCursor(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b border-gray-200 bg-gray-50">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="px-3 py-3 text-center">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
              {monthDays.map((d) => {
                const key = ymd(d);
                const items = apptsByDay.get(key) ?? [];
                const inMonth = d.getMonth() === monthCursor.getMonth();
                const isToday = ymd(d) === ymd(new Date());

                return (
                  <button
                    key={key}
                    className={`min-h-[100px] p-2 text-left hover:bg-gray-50 transition relative ${
                      inMonth ? 'bg-white' : 'bg-gray-50/50'
                    } ${isToday ? 'ring-2 ring-inset ring-emerald-500' : ''}`}
                    onClick={() => {
                      if (!isCalendarSetupComplete) return;
                      // Show day view with all appointments for this day
                      setSelectedDate(key);
                      setIsDayViewOpen(true);
                    }}
                    disabled={!isCalendarSetupComplete}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-emerald-600' : inMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((a) => (
                        <div
                          key={a.appointment_id}
                          className="text-xs truncate text-white bg-emerald-500 rounded px-1.5 py-0.5 cursor-pointer hover:bg-emerald-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAppointment(a.appointment_id);
                          }}
                        >
                          {a.contact_name || a.service_type || 'Appointment'}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium">+{items.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse border-b border-gray-200 pb-3">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="space-y-3">
              {filteredAppointments.slice(0, showAllAppointments ? 50 : 3).map((apt) => {
                const s = statusBadge(apt.status);
                return (
                  <div
                    key={apt.appointment_id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => handleViewAppointment(apt.appointment_id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-900 truncate">
                            {apt.contact_name || apt.contact_email || apt.contact_phone || 'Appointment'}
                          </div>
                          <Badge variant="outline" className={s.className}>
                            {s.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatDateTime(apt.scheduled_start)} • {apt.service_type || 'Service'}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 mt-1" />
                    </div>
                  </div>
                );
              })}
              {filteredAppointments.length > 3 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllAppointments(!showAllAppointments)}
                  >
                    {showAllAppointments ? `Show less` : `Show ${filteredAppointments.length - 3} more`}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments scheduled</h3>
              <p className="text-sm text-gray-500">Your AI receptionist can schedule appointments during calls.</p>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      ) : null}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Customer</div>
                  <div className="font-medium text-gray-900">{selectedAppointment.contact_name || '—'}</div>
                  <div className="text-sm text-gray-600">{selectedAppointment.contact_email || selectedAppointment.contact_phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  {(() => {
                    const s = statusBadge(selectedAppointment.status);
                    return (
                      <Badge variant="outline" className={s.className}>
                        {s.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Start</div>
                  <div className="font-medium text-gray-900">{formatDateTime(selectedAppointment.scheduled_start)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">End</div>
                  <div className="font-medium text-gray-900">{formatDateTime(selectedAppointment.scheduled_end)}</div>
                </div>
              </div>

              {selectedAppointment.address?.street || selectedAppointment.address?.city ? (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Address</div>
                  <div className="text-sm text-gray-700">
                    {[selectedAppointment.address?.street, selectedAppointment.address?.city, selectedAppointment.address?.state, selectedAppointment.address?.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              ) : null}

              {selectedAppointment.notes ? (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Notes</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAppointment.notes}</div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleEditAppointment(selectedAppointment)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteClick(selectedAppointment)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Customer name</div>
              <Input value={createDraft.contact_name} onChange={(e) => setCreateDraft((p: any) => ({ ...p, contact_name: e.target.value }))} placeholder="e.g., John Doe" />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Customer email (optional)</div>
              <Input value={createDraft.contact_email} onChange={(e) => setCreateDraft((p: any) => ({ ...p, contact_email: e.target.value }))} placeholder="e.g., john@email.com" />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Customer phone (optional)</div>
              <Input value={createDraft.contact_phone} onChange={(e) => setCreateDraft((p: any) => ({ ...p, contact_phone: e.target.value }))} placeholder="e.g., +18324041336" />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Date</div>
              <Input type="date" value={createDraft.date} onChange={(e) => setCreateDraft((p: any) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Start time</div>
              <Input type="time" value={createDraft.start_time} onChange={(e) => setCreateDraft((p: any) => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Duration (minutes)</div>
              <Input type="number" value={createDraft.duration_minutes} onChange={(e) => setCreateDraft((p: any) => ({ ...p, duration_minutes: e.target.value }))} min={10} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Service</div>
              <Input value={createDraft.service_type} onChange={(e) => setCreateDraft((p: any) => ({ ...p, service_type: e.target.value }))} placeholder={company?.service_type || 'Service'} />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Notes (optional)</div>
              <Input value={createDraft.notes} onChange={(e) => setCreateDraft((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Add details for your team..." />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Address (optional)</div>
              <Input value={createDraft.address_street} onChange={(e) => setCreateDraft((p: any) => ({ ...p, address_street: e.target.value }))} placeholder="Street" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <Input value={createDraft.address_city} onChange={(e) => setCreateDraft((p: any) => ({ ...p, address_city: e.target.value }))} placeholder="City" />
                <Input value={createDraft.address_state} onChange={(e) => setCreateDraft((p: any) => ({ ...p, address_state: e.target.value }))} placeholder="State" />
                <Input value={createDraft.address_zip} onChange={(e) => setCreateDraft((p: any) => ({ ...p, address_zip: e.target.value }))} placeholder="Zip" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Price (optional)</div>
              <Input value={createDraft.price} onChange={(e) => setCreateDraft((p: any) => ({ ...p, price: e.target.value }))} placeholder="e.g., 149.00" />
            </div>

            <div className="sm:col-span-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Recurring appointment</Label>
                <input
                  type="checkbox"
                  checked={!!createDraft.recurrence_enabled}
                  onChange={(e) => setCreateDraft((p: any) => ({ ...p, recurrence_enabled: e.target.checked }))}
                />
              </div>
              {createDraft.recurrence_enabled ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  <select
                    className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                    value={createDraft.recurrence_frequency}
                    onChange={(e) => setCreateDraft((p: any) => ({ ...p, recurrence_frequency: e.target.value }))}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                  <Input
                    type="number"
                    value={createDraft.recurrence_interval}
                    onChange={(e) => setCreateDraft((p: any) => ({ ...p, recurrence_interval: e.target.value }))}
                    placeholder="Interval"
                    min={1}
                  />
                  <Input
                    type="number"
                    value={createDraft.recurrence_count}
                    onChange={(e) => setCreateDraft((p: any) => ({ ...p, recurrence_count: e.target.value }))}
                    placeholder="Occurrences"
                    min={1}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalendarProviderDialogOpen} onOpenChange={setIsCalendarProviderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Calendar Provider</DialogTitle>
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
              <div className="text-sm text-gray-600 mt-1">Connect your iCloud calendar using app-specific password</div>
            </button>
          </div>
          {showAppleForm ? (
            <div className="space-y-4 mt-4 border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">How to create an app-specific password:</div>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer" className="underline">appleid.apple.com</a></li>
                  <li>Sign in with your Apple ID</li>
                  <li>Go to "Sign-In and Security" → "App-Specific Passwords"</li>
                  <li>Click "Generate an app-specific password"</li>
                  <li>Enter a label (e.g., "HandyCall Calendar")</li>
                  <li>Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)</li>
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
                  <div className="text-xs text-gray-500 mt-1">This password is stored securely and only used for calendar access</div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowAppleForm(false);
                  setAppleEmail('');
                  setApplePassword('');
                }}>
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

      <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Set up your calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                className={`border rounded-lg p-4 text-left hover:border-emerald-500 transition ${
                  setupChoice === 'INTERNAL' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                }`}
                onClick={() => setSetupChoice('INTERNAL')}
              >
                <div className="font-semibold text-gray-900">Create new calendar</div>
                <div className="text-sm text-gray-600 mt-1">Manage appointments inside HandyCall. Best option to start.</div>
              </button>
              <button
                className={`border rounded-lg p-4 text-left hover:border-blue-500 transition ${
                  setupChoice === 'EXTERNAL' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSetupChoice('EXTERNAL')}
              >
                <div className="font-semibold text-gray-900">Connect existing calendar</div>
                <div className="text-sm text-gray-600 mt-1">Google / Outlook / Apple sync (UI now; sync wiring next).</div>
              </button>
            </div>

            <div>
              <Label className="text-sm">Timezone</Label>
              <Input value={setupTimezone} onChange={(e) => setSetupTimezone(e.target.value)} placeholder="e.g., America/New_York" />
              <div className="text-xs text-gray-500 mt-1">Use an IANA timezone (same format as Settings).</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsSetupOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteSetup} disabled={!setupChoice}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day View Dialog */}
      <Dialog open={isDayViewOpen} onOpenChange={setIsDayViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedDateFormatted}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setCreateDraft((p: any) => ({ ...p, date: selectedDate }));
                  setIsDayViewOpen(false);
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>
            {selectedDayAppointments.length > 0 ? (
              <div className="space-y-3">
                {selectedDayAppointments.map((apt: any) => {
                  const s = statusBadge(apt.status);
                  const startTime = new Date(apt.scheduled_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const endTime = new Date(apt.scheduled_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={apt.appointment_id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-gray-900 truncate">
                              {apt.contact_name || apt.contact_email || apt.contact_phone || 'Appointment'}
                            </div>
                            <Badge variant="outline" className={s.className}>
                              {s.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {startTime} - {endTime} • {apt.service_type || 'Service'}
                          </div>
                          {apt.notes && (
                            <div className="text-sm text-gray-500 mt-1 truncate">{apt.notes}</div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsDayViewOpen(false);
                              handleEditAppointment(apt);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsDayViewOpen(false);
                              handleDeleteClick(apt);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments</h3>
                <p className="text-sm text-gray-500">Click the button above to add an appointment for this day.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Customer name</div>
              <Input value={editDraft.contact_name || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, contact_name: e.target.value }))} placeholder="e.g., John Doe" />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Customer email</div>
              <Input value={editDraft.contact_email || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, contact_email: e.target.value }))} placeholder="e.g., john@email.com" />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Customer phone</div>
              <Input value={editDraft.contact_phone || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, contact_phone: e.target.value }))} placeholder="e.g., +18324041336" />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Date</div>
              <Input type="date" value={editDraft.date || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Start time</div>
              <Input type="time" value={editDraft.start_time || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Duration (minutes)</div>
              <Input type="number" value={editDraft.duration_minutes || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, duration_minutes: e.target.value }))} min={10} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Service</div>
              <Input value={editDraft.service_type || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, service_type: e.target.value }))} placeholder={company?.service_type || 'Service'} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <select
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                value={editDraft.status || 'SCHEDULED'}
                onChange={(e) => setEditDraft((p: any) => ({ ...p, status: e.target.value }))}
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Notes</div>
              <Input value={editDraft.notes || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Add details..." />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Address</div>
              <Input value={editDraft.address_street || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, address_street: e.target.value }))} placeholder="Street" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <Input value={editDraft.address_city || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, address_city: e.target.value }))} placeholder="City" />
                <Input value={editDraft.address_state || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, address_state: e.target.value }))} placeholder="State" />
                <Input value={editDraft.address_zip || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, address_zip: e.target.value }))} placeholder="Zip" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Price</div>
              <Input value={editDraft.price || ''} onChange={(e) => setEditDraft((p: any) => ({ ...p, price: e.target.value }))} placeholder="e.g., 149.00" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAppointment}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>
            {appointmentToDelete && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-medium text-gray-900">
                  {appointmentToDelete.contact_name || appointmentToDelete.service_type || 'Appointment'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatDateTime(appointmentToDelete.scheduled_start)}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Settings Dialog */}
      <Dialog open={isCalendarSettingsOpen} onOpenChange={setIsCalendarSettingsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calendar Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isExternalCalendarConnected && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium text-emerald-800">
                    Connected to {company?.calendar_provider === 'GOOGLE' ? 'Google Calendar' : company?.calendar_provider === 'MICROSOFT' ? 'Microsoft Outlook' : company?.calendar_provider === 'APPLE' ? 'Apple Calendar' : 'External Calendar'}
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">Timezone</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {calendarTimezone || 'Not set yet'}
                    {isExternalCalendarConnected ? ' (from connected calendar)' : ''}
                  </div>
                </div>
                {!isExternalCalendarConnected && (
                  <div className="w-full max-w-xs">
                    <Input
                      value={calendarTimezone}
                      onChange={(e) => setCalendarTimezone(e.target.value)}
                      placeholder="e.g., America/Chicago"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">IANA timezone format</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-900">Weekly working hours</div>
              <div className="text-xs text-gray-600 mt-1">Set one or more available time windows per day.</div>

              <div className="mt-4 space-y-3">
                {WEEKDAYS.map(({ key, label }) => {
                  const day = businessHoursDraft[key] || {};
                  const segments = Array.isArray(day.segments) ? day.segments : [];
                  const closed = !!day.closed || segments.length === 0;
                  return (
                    <div key={key} className="rounded-md border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900">{label}</div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={closed}
                            onChange={(e) => {
                              const nextClosed = e.target.checked;
                              setBusinessHoursDraft((prev) => ({
                                ...prev,
                                [key]: nextClosed ? { closed: true, segments: [] } : { closed: false, segments: [{ open: '09:00', close: '17:00' }] },
                              }));
                            }}
                          />
                          Closed
                        </label>
                      </div>

                      {!closed && (
                        <div className="mt-3 space-y-2">
                          {segments.map((seg, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={seg.open}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setBusinessHoursDraft((prev) => {
                                    const cur = prev[key] || {};
                                    const nextSegs = (Array.isArray(cur.segments) ? [...cur.segments] : []).map((s, i) =>
                                      i === idx ? { ...s, open: v } : s
                                    );
                                    return { ...prev, [key]: { ...cur, closed: false, segments: nextSegs } };
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-500">to</span>
                              <Input
                                type="time"
                                value={seg.close}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setBusinessHoursDraft((prev) => {
                                    const cur = prev[key] || {};
                                    const nextSegs = (Array.isArray(cur.segments) ? [...cur.segments] : []).map((s, i) =>
                                      i === idx ? { ...s, close: v } : s
                                    );
                                    return { ...prev, [key]: { ...cur, closed: false, segments: nextSegs } };
                                  });
                                }}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setBusinessHoursDraft((prev) => {
                                    const cur = prev[key] || {};
                                    const nextSegs = (Array.isArray(cur.segments) ? [...cur.segments] : []).filter((_, i) => i !== idx);
                                    return { ...prev, [key]: nextSegs.length ? { ...cur, closed: false, segments: nextSegs } : { closed: true, segments: [] } };
                                  });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => {
                              setBusinessHoursDraft((prev) => {
                                const cur = prev[key] || {};
                                const nextSegs = Array.isArray(cur.segments) ? [...cur.segments] : [];
                                nextSegs.push({ open: '09:00', close: '17:00' });
                                return { ...prev, [key]: { ...cur, closed: false, segments: nextSegs } };
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add timeframe
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-sm font-medium text-gray-900">Date exceptions</div>
              <div className="text-xs text-gray-600 mt-1">Override availability for a specific date (vacation, holidays, partial day).</div>

              <div className="mt-4 space-y-3">
                {(dateOverridesDraft || []).map((o, idx) => {
                  const segments = Array.isArray(o.segments) ? o.segments : [];
                  const closed = !!o.closed || segments.length === 0;
                  return (
                    <div key={`${o.date}-${idx}`} className="rounded-md border border-gray-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={o.date}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDateOverridesDraft((prev) => prev.map((x, i) => (i === idx ? { ...x, date: v } : x)));
                            }}
                          />
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={closed}
                              onChange={(e) => {
                                const nextClosed = e.target.checked;
                                setDateOverridesDraft((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? nextClosed
                                        ? { ...x, closed: true, segments: [] }
                                        : { ...x, closed: false, segments: [{ open: '09:00', close: '17:00' }] }
                                      : x
                                  )
                                );
                              }}
                            />
                            Closed
                          </label>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDateOverridesDraft((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {!closed && (
                        <div className="mt-3 space-y-2">
                          {segments.map((seg, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={seg.open}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setDateOverridesDraft((prev) =>
                                    prev.map((x, i) => {
                                      if (i !== idx) return x;
                                      const nextSegs = (Array.isArray(x.segments) ? [...x.segments] : []).map((s, j) =>
                                        j === sIdx ? { ...s, open: v } : s
                                      );
                                      return { ...x, segments: nextSegs, closed: false };
                                    })
                                  );
                                }}
                              />
                              <span className="text-sm text-gray-500">to</span>
                              <Input
                                type="time"
                                value={seg.close}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setDateOverridesDraft((prev) =>
                                    prev.map((x, i) => {
                                      if (i !== idx) return x;
                                      const nextSegs = (Array.isArray(x.segments) ? [...x.segments] : []).map((s, j) =>
                                        j === sIdx ? { ...s, close: v } : s
                                      );
                                      return { ...x, segments: nextSegs, closed: false };
                                    })
                                  );
                                }}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setDateOverridesDraft((prev) =>
                                    prev.map((x, i) => {
                                      if (i !== idx) return x;
                                      const nextSegs = (Array.isArray(x.segments) ? [...x.segments] : []).filter((_, j) => j !== sIdx);
                                      return nextSegs.length ? { ...x, segments: nextSegs, closed: false } : { ...x, segments: [], closed: true };
                                    })
                                  );
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => {
                              setDateOverridesDraft((prev) =>
                                prev.map((x, i) => {
                                  if (i !== idx) return x;
                                  const nextSegs = Array.isArray(x.segments) ? [...x.segments] : [];
                                  nextSegs.push({ open: '09:00', close: '17:00' });
                                  return { ...x, segments: nextSegs, closed: false };
                                })
                              );
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add timeframe
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  onClick={() =>
                    setDateOverridesDraft((prev) => [
                      ...prev,
                      { date: ymd(new Date()), closed: true, segments: [] },
                    ])
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add date exception
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setIsDeleteCalendarConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect Calendar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCalendarSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCalendarSettings}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Calendar Confirmation Dialog */}
      <Dialog open={isDeleteCalendarConfirmOpen} onOpenChange={setIsDeleteCalendarConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to disconnect your calendar? Your appointments will remain, but new events won't sync with your external calendar.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteCalendarConfirmOpen(false)} disabled={isDisconnecting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDisconnectCalendar} disabled={isDisconnecting}>
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
