'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ExternalLink, Link as LinkIcon, Settings } from 'lucide-react';

export default function AppointmentsPage() {
  const [company, setCompany] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTypeIdDraft, setEventTypeIdDraft] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const calcomBaseUrl = useMemo(() => 'https://cal.handycall.org', []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [c, a] = await Promise.all([apiClient.getMyCompany(), apiClient.getAppointments(50)]);
      setCompany(c);
      setAppointments(a.appointments || []);
      setEventTypeIdDraft(c?.calcom_event_type_id ? String(c.calcom_event_type_id) : '');
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

  const handleSaveEventType = async () => {
    const parsed = parseInt(eventTypeIdDraft, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Event Type ID must be a positive number');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updated = await apiClient.updateMyCompany({ calcom_event_type_id: parsed, calcom_connected: true });
      setCompany(updated);
    } catch (err: any) {
      console.error('Error saving Cal.com Event Type ID:', err);
      setError(err?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewAppointment = async (appointmentId: string) => {
    try {
      const appt = await apiClient.getAppointmentById(appointmentId);
      setSelectedAppointment(appt);
      setIsDialogOpen(true);
    } catch (err: any) {
      console.error('Error loading appointment:', err);
      setError(err?.message || 'Failed to load appointment');
    }
  };

  const isConfigured = Boolean(company?.calcom_event_type_id);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <p className="mt-2 text-gray-600">Manage your scheduled appointments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Calendar Setup
              </span>
              <Badge variant="outline" className={isConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}>
                {isConfigured ? 'Ready' : 'Needs setup'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              HandyCall uses Cal.com behind the scenes for availability and bookings. Connect your calendar in Cal.com, then paste your
              Cal.com Event Type ID here so the AI can schedule appointments during calls.
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Cal.com Event Type ID (e.g. 2)"
                value={eventTypeIdDraft}
                onChange={(e) => setEventTypeIdDraft(e.target.value)}
              />
              <Button onClick={handleSaveEventType} disabled={isSaving}>
                <Settings className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(`${calcomBaseUrl}/apps`, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect calendar (Google / Microsoft / Apple)
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`${calcomBaseUrl}/event-types`, '_blank', 'noopener,noreferrer')}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Manage event types
              </Button>
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
              <span className="text-gray-600">Event Type ID</span>
              <span className="font-medium text-gray-900 truncate">{company?.calcom_event_type_id ? String(company.calcom_event_type_id) : '—'}</span>
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
              <p className="text-sm text-gray-500">Your AI receptionist can help schedule appointments when customers call.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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

              {(selectedAppointment.external_booking_uid || selectedAppointment.external_booking_id) && (
                <div className="rounded-lg border border-gray-200 p-3 text-sm">
                  <div className="text-xs text-gray-500 mb-1">Cal.com booking</div>
                  <div className="text-gray-700">
                    UID: <span className="font-mono">{selectedAppointment.external_booking_uid || '—'}</span>
                  </div>
                  <div className="text-gray-700">
                    ID: <span className="font-mono">{selectedAppointment.external_booking_id || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
