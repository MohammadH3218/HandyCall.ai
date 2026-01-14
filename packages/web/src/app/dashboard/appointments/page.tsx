'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ChevronLeft, ChevronRight, ExternalLink, Plus } from 'lucide-react';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AppointmentsPage() {
  const [company, setCompany] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<any>({
    contact_name: '',
    contact_email: '',
    service_type: '',
    date: '',
    start_time: '09:00',
    duration_minutes: 60,
    notes: '',
  });

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
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

  const apptsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of appointments) {
      const ms = typeof a?.scheduled_start === 'number' ? a.scheduled_start : Date.parse(a?.scheduled_start);
      if (!Number.isFinite(ms)) continue;
      const key = ymd(new Date(ms));
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [appointments]);

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
      setAppointments(a.appointments || []);
    } catch (err: any) {
      console.error('Error loading appointments:', err);
      setError(err?.message || 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status?: string): { label: string; className: string } => {
    const s = (status || '').toUpperCase();
    if (s === 'SCHEDULED') return { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (s === 'CONFIRMED') return { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (s === 'CANCELLED') return { label: 'Cancelled', className: 'bg-gray-50 text-gray-700 border-gray-200' };
    if (s === 'COMPLETED') return { label: 'Completed', className: 'bg-gray-50 text-gray-700 border-gray-200' };
    return { label: status || 'Unknown', className: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const formatDateTime = (ts?: number | string) => {
    if (!ts) return 'N/A';
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      const date = (createDraft.date || '').trim();
      const start = (createDraft.start_time || '').trim();
      if (!date || !start) {
        setError('Please choose a date and start time');
        return;
      }
      const duration = Math.max(10, Number(createDraft.duration_minutes) || 60);
      const startLocal = new Date(`${date}T${start}:00`);
      const startMs = startLocal.getTime();
      const endMs = startMs + duration * 60_000;

      await apiClient.createAppointment({
        scheduled_start: startMs,
        scheduled_end: endMs,
        contact_name: createDraft.contact_name,
        contact_email: createDraft.contact_email,
        service_type: createDraft.service_type || company?.service_type,
        notes: createDraft.notes,
        created_by: 'USER',
      });

      setIsCreateOpen(false);
      setCreateDraft((p: any) => ({ ...p, contact_name: '', contact_email: '', notes: '' }));
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create appointment');
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
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Calendar
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-medium text-gray-900 min-w-[160px] text-center">{monthLabel}</div>
                <Button
                  variant="outline"
                  onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 text-xs font-medium text-gray-600 border-b border-gray-100 pb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="px-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden mt-2">
              {monthDays.map((d) => {
                const key = ymd(d);
                const items = apptsByDay.get(key) ?? [];
                const inMonth = d.getMonth() === monthCursor.getMonth();
                return (
                  <button
                    key={key}
                    className={`bg-white p-2 h-[92px] text-left hover:bg-blue-50 transition-colors ${
                      inMonth ? '' : 'opacity-50'
                    }`}
                    onClick={() => {
                      setCreateDraft((p: any) => ({ ...p, date: key }));
                      setIsCreateOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-900">{d.getDate()}</div>
                      {items.length > 0 ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {items.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1">
                      {items.slice(0, 2).map((a) => (
                        <div key={a.appointment_id} className="text-[11px] truncate text-gray-700">
                          {a.contact_name || a.contact_email || 'Appointment'}
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Company</span>
              <span className="font-medium text-gray-900 truncate">{company?.company_name || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Timezone</span>
              <span className="font-medium text-gray-900 truncate">{company?.timezone || 'UTC'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Loaded</span>
              <span className="font-medium text-gray-900 truncate">{isLoading ? '…' : appointments.length}</span>
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
          ) : appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => {
                const status = getStatusBadge(apt.status);
                return (
                  <div
                    key={apt.appointment_id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => handleViewAppointment(apt.appointment_id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-gray-900 truncate">
                            {apt.contact_name || apt.contact_email || 'Appointment'}
                          </div>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
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
                  <div className="text-sm text-gray-600">{selectedAppointment.contact_email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  {(() => {
                    const s = getStatusBadge(selectedAppointment.status);
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
              <Input
                value={createDraft.contact_name}
                onChange={(e) => setCreateDraft((p: any) => ({ ...p, contact_name: e.target.value }))}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Customer email (optional)</div>
              <Input
                value={createDraft.contact_email}
                onChange={(e) => setCreateDraft((p: any) => ({ ...p, contact_email: e.target.value }))}
                placeholder="e.g., john@email.com"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Date</div>
              <Input
                type="date"
                value={createDraft.date}
                onChange={(e) => setCreateDraft((p: any) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Start time</div>
              <Input
                type="time"
                value={createDraft.start_time}
                onChange={(e) => setCreateDraft((p: any) => ({ ...p, start_time: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Duration (minutes)</div>
              <Input
                type="number"
                min={10}
                step={5}
                value={createDraft.duration_minutes}
                onChange={(e) => setCreateDraft((p: any) => ({ ...p, duration_minutes: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Service</div>
              <Input
                value={createDraft.service_type}
                onChange={(e) => setCreateDraft((p: any) => ({ ...p, service_type: e.target.value }))}
                placeholder={company?.service_type || 'Service'}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Notes (optional)</div>
              <Input
                value={createDraft.notes}
                onChange={(e) => setCreateDraft((p: any) => ({ ...p, notes: e.target.value }))}
                placeholder="Add details for your team..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

