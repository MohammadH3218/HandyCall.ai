'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/portal/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/portal/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle2, Clock3, MessageSquareText, RefreshCw, Search, XCircle } from 'lucide-react';

type Appointment = {
  appointment_id: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  service_type?: string;
  status?: string;
  scheduled_start?: number;
  scheduled_end?: number;
  scheduled_time?: string;
  notes?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
};

type ViewMode = 'agenda' | 'calendar';

const statusTabs = ['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
type StatusTab = (typeof statusTabs)[number];

function formatDateTime(value?: number | string) {
  if (!value) return '-';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function appointmentTime(appointment: Appointment) {
  return appointment.scheduled_start || appointment.scheduled_time;
}

function appointmentTimestamp(appointment: Appointment) {
  if (typeof appointment.scheduled_start === 'number') return appointment.scheduled_start;
  if (typeof appointment.scheduled_start === 'string') return Date.parse(appointment.scheduled_start);
  if (typeof appointment.scheduled_time === 'string') return Date.parse(appointment.scheduled_time);
  return 0;
}

function appointmentStatus(status?: string) {
  const value = String(status || '').toUpperCase();
  if (value === 'CONFIRMED') return { label: 'Confirmed', variant: 'success' as const };
  if (value === 'COMPLETED') return { label: 'Completed', variant: 'secondary' as const };
  if (value === 'CANCELLED') return { label: 'Cancelled', variant: 'destructive' as const };
  return { label: 'Scheduled', variant: 'info' as const };
}

export default function AppointmentsPage() {
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    void loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getAppointments(200);
      const list = (response?.appointments || []) as Appointment[];
      const sorted = [...list].sort((a, b) => {
        const aTime = appointmentTimestamp(a);
        const bTime = appointmentTimestamp(b);
        return aTime - bTime;
      });

      setAppointments(sorted);
      setSelected(sorted[0] || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const statusMatches =
        statusFilter === 'ALL' || String(appointment.status || '').toUpperCase() === statusFilter;

      const text = `${appointment.contact_name || ''} ${appointment.contact_phone || ''} ${appointment.service_type || ''} ${appointment.notes || ''}`.toLowerCase();
      const searchMatches = !query || text.includes(query);

      return statusMatches && searchMatches;
    });
  }, [appointments, searchQuery, statusFilter]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    filtered.forEach((appointment) => {
      const date = new Date(appointmentTimestamp(appointment));
      const key = Number.isNaN(date.getTime())
        ? 'Unknown date'
        : date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

      const current = map.get(key) || [];
      current.push(appointment);
      map.set(key, current);
    });

    return Array.from(map.entries());
  }, [filtered]);

  const calendarCells = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstWeekday = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - firstWeekday);

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const key = day.toDateString();
      const items = filtered.filter((appointment) => {
        const aptDate = new Date(appointmentTimestamp(appointment));
        return aptDate.toDateString() === key;
      });
      return { day, items };
    });
  }, [filtered]);

  const handleOpenReschedule = () => {
    if (!selected) return;
    const source = new Date(appointmentTimestamp(selected) || Date.now());
    setRescheduleDate(source.toISOString().slice(0, 10));
    setRescheduleTime(`${String(source.getHours()).padStart(2, '0')}:${String(source.getMinutes()).padStart(2, '0')}`);
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!selected || !rescheduleDate || !rescheduleTime) return;

    try {
      setUpdating(true);
      const nextDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);

      await apiClient.updateAppointment(selected.appointment_id, {
        scheduled_start: nextDate.getTime(),
      });

      setRescheduleOpen(false);
      await loadAppointments();
      toast({ title: 'Appointment rescheduled', description: 'Calendar updates were saved.' });
    } catch (err: any) {
      toast({ title: 'Reschedule failed', description: err.message || 'Unable to update appointment.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!selected) return;

    try {
      setUpdating(true);
      await apiClient.cancelAppointment(selected.appointment_id);
      await loadAppointments();
      toast({ title: 'Appointment cancelled', description: 'The appointment is now marked as cancelled.' });
    } catch (err: any) {
      toast({ title: 'Cancel failed', description: err.message || 'Unable to cancel appointment.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    if (!selected) return;

    try {
      setUpdating(true);
      await apiClient.updateAppointment(selected.appointment_id, { status: 'COMPLETED' });
      await loadAppointments();
      toast({ title: 'Appointment completed', description: 'Status updated to completed.' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message || 'Unable to update status.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleMessage = () => {
    if (!selected) return;
    toast({
      title: 'Message action',
      description: `Open SMS workflow for ${selected.contact_name || selected.contact_phone || 'this contact'}.`,
    });
  };

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Appointments" subtitle="There was a problem loading your schedule." />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-3" onClick={() => void loadAppointments()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Appointments"
        title="Schedule"
        subtitle="Agenda first view with quick actions for rescheduling, cancellation, and completion."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={viewMode === 'agenda' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('agenda')}>
          Agenda
        </Button>
        <Button variant={viewMode === 'calendar' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('calendar')}>
          Calendar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid min-h-[640px] grid-cols-1 divide-y divide-border xl:grid-cols-[1fr_360px] xl:divide-x xl:divide-y-0">
            <section className="min-h-0">
              <div className="border-b border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-[220px] flex-1">
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by customer or service"
                      leadingIcon={<Search className="h-4 w-4" />}
                    />
                  </div>
                  {statusTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-standard ease-standard ${
                        statusFilter === tab
                          ? 'border-primary/45 bg-primary/12 text-[#cbe8ff]'
                          : 'border-border bg-[#0f1115] text-muted-foreground hover:border-[#313538] hover:text-foreground'
                      }`}
                    >
                      {tab === 'ALL' ? 'All' : tab.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[580px] overflow-auto p-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="h-6 w-6" />}
                    title="No appointments"
                    description="Your scheduled jobs will appear here once bookings are created."
                  />
                ) : viewMode === 'agenda' ? (
                  <div className="space-y-4">
                    {groupedByDay.map(([dateLabel, items]) => (
                      <div key={dateLabel}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">{dateLabel}</p>
                        <div className="space-y-2">
                          {items.map((appointment) => {
                            const status = appointmentStatus(appointment.status);
                            const selectedState = selected?.appointment_id === appointment.appointment_id;

                            return (
                              <button
                                key={appointment.appointment_id}
                                type="button"
                                onClick={() => setSelected(appointment)}
                                className={`w-full rounded-md border px-3 py-3 text-left transition-colors duration-standard ease-standard ${
                                  selectedState
                                    ? 'border-primary/45 bg-primary/12'
                                    : 'border-border bg-[#0f1115] hover:border-[#313538]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {appointment.contact_name || 'Unknown customer'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {appointment.service_type || 'Service'}  -  {formatDateTime(appointmentTime(appointment))}
                                    </p>
                                  </div>
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {calendarCells.map(({ day, items }, index) => {
                      const isCurrentMonth = day.getMonth() === new Date().getMonth();
                      return (
                        <button
                          key={`${day.toISOString()}-${index}`}
                          type="button"
                          onClick={() => {
                            if (items.length > 0) setSelected(items[0]);
                          }}
                          className={`min-h-[90px] rounded-md border p-2 text-left ${
                            isCurrentMonth
                              ? 'border-border bg-[#0f1115]'
                              : 'border-border/50 bg-[#0d0f13] text-text-faint'
                          }`}
                        >
                          <p className="text-xs font-medium">{day.getDate()}</p>
                          <div className="mt-1 space-y-1">
                            {items.slice(0, 2).map((appointment) => (
                              <p key={appointment.appointment_id} className="truncate rounded bg-primary/12 px-1 py-0.5 text-[10px] text-[#cbe8ff]">
                                {appointment.contact_name || 'Booking'}
                              </p>
                            ))}
                            {items.length > 2 ? (
                              <p className="text-[10px] text-text-faint">+{items.length - 2} more</p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[#0f1115] p-4">
              {selected ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-[#13161b] p-3">
                    <p className="text-sm font-semibold text-foreground">{selected.contact_name || 'Appointment detail'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selected.contact_phone || selected.contact_email || 'No contact info'}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selected.service_type || 'Service'}  -  {formatDateTime(appointmentTime(selected))}
                    </p>
                    <div className="mt-3">
                      <Badge variant={appointmentStatus(selected.status).variant}>{appointmentStatus(selected.status).label}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border bg-[#13161b] p-3 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {formatDateTime(appointmentTime(selected))}</p>
                    <p className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" /> Ends {formatDateTime(selected.scheduled_end)}</p>
                    <p>{selected.notes || 'No additional notes.'}</p>
                    {selected.address ? (
                      <p>
                        {selected.address.street || ''} {selected.address.city || ''} {selected.address.state || ''} {selected.address.zip || ''}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" onClick={handleOpenReschedule} disabled={updating}>
                      <RefreshCw className="h-4 w-4" />
                      Reschedule
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleMessage}>
                      <MessageSquareText className="h-4 w-4" />
                      Message
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleComplete} disabled={updating}>
                      <CheckCircle2 className="h-4 w-4" />
                      Complete
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleCancel} disabled={updating}>
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Calendar className="h-6 w-6" />}
                  title="Select an appointment"
                  description="Choose an item from the agenda or calendar to view full details and actions."
                />
              )}
            </aside>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
            <DialogDescription>Pick a new date and time for this job.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Date</label>
              <Input type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Time</label>
              <Input type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleReschedule()} disabled={updating || !rescheduleDate || !rescheduleTime}>
              {updating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

