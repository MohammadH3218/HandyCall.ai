'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, Plus } from 'lucide-react';

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

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupChoice, setSetupChoice] = useState<'INTERNAL' | 'EXTERNAL' | null>(null);
  const [setupTimezone, setSetupTimezone] = useState('');

  const [isCalendarProviderDialogOpen, setIsCalendarProviderDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'GOOGLE' | 'MICROSOFT' | null>(null);

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

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCursor]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [c, a] = await Promise.all([
        apiClient.getMyCompany(),
        apiClient.getAppointmentsRange(visibleRange.start.toISOString(), visibleRange.end.toISOString()),
      ]);
      setCompany(c);
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
    if (!setupTimezone) {
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
      } else if (selectedProvider === 'MICROSOFT') {
        response = await apiClient.getMicrosoftCalendarAuthUrl();
      }

      if (response?.url) {
        // Redirect to OAuth URL
        window.location.href = response.url;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect calendar');
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Calendar
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-medium text-gray-900 min-w-[160px] text-center">{monthLabel}</div>
                <Button variant="outline" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full">
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
              </div>
              <div className="text-xs text-gray-500">{isLoading ? 'Loading…' : `${filteredAppointments.length} shown`}</div>
            </div>

            <div className="grid grid-cols-7 text-xs font-medium text-gray-600 border-b border-gray-100 pb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="px-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-100 mt-2 rounded-lg overflow-hidden">
              {monthDays.map((d) => {
                const key = ymd(d);
                const items = apptsByDay.get(key) ?? [];
                const inMonth = d.getMonth() === monthCursor.getMonth();
                const isToday = ymd(d) === ymd(new Date());

                return (
                  <button
                    key={key}
                    className={`bg-white p-2 min-h-[86px] text-left hover:bg-gray-50 transition ${
                      inMonth ? '' : 'opacity-60'
                    }`}
                    onClick={() => {
                      if (!isCalendarSetupComplete) return;
                      setCreateDraft((p: any) => ({ ...p, date: key }));
                      setIsCreateOpen(true);
                    }}
                    disabled={!isCalendarSetupComplete}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>{d.getDate()}</div>
                      {items.length > 0 ? (
                        <div className="text-[10px] text-gray-500">{items.length} appt</div>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1">
                      {items.slice(0, 2).map((a) => (
                        <div key={a.appointment_id} className="text-[11px] truncate text-gray-700">
                          {a.contact_name || a.contact_email || a.contact_phone || 'Appointment'}
                        </div>
                      ))}
                      {items.length > 2 ? <div className="text-[11px] text-gray-500">+{items.length - 2} more</div> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Company</span>
              <span className="font-medium text-gray-900 truncate">{company?.company_name || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Timezone</span>
              <span className="font-medium text-gray-900 truncate">{company?.timezone || 'UTC'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Loaded</span>
              <span className="font-medium text-gray-900 truncate">{isLoading ? '…' : filteredAppointments.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

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
              {filteredAppointments.slice(0, 50).map((apt) => {
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
            <div className="border rounded-lg p-4 bg-gray-50 opacity-60">
              <div className="font-semibold text-gray-600">Apple iCloud Calendar</div>
              <div className="text-sm text-gray-500 mt-1">Coming soon</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCalendarProviderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnectExternalCalendar} disabled={!selectedProvider}>
              Connect
            </Button>
          </div>
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
    </div>
  );
}
