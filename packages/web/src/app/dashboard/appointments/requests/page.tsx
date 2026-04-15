'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { useToast } from '@/hooks/use-toast';
import {
  IconCheck,
  IconX,
  IconCalendar,
  IconUser,
  IconPhone,
  IconClipboardList,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type BookingRequest = {
  appointment_id: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  service_type?: string;
  scheduled_start?: number;
  scheduled_end?: number;
  notes?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  created_at?: number;
};

function formatDateTime(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function BookingRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [declineDialogId, setDeclineDialogId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [decliningSubmitting, setDecliningSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPendingBookingRequests();
      setRequests(data.appointments || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAccept = async (appointmentId: string) => {
    setProcessingId(appointmentId);
    try {
      await apiClient.acceptAppointment(appointmentId);
      toast({ title: 'Booking accepted', description: 'The customer has been notified.' });
      setRequests((prev) => prev.filter((r) => r.appointment_id !== appointmentId));
    } catch (err: any) {
      toast({ title: 'Failed to accept', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDecline = (appointmentId: string) => {
    setDeclineDialogId(appointmentId);
    setDeclineReason('');
  };

  const handleDeclineSubmit = async () => {
    if (!declineDialogId) return;
    setDecliningSubmitting(true);
    try {
      await apiClient.declineAppointment(declineDialogId, declineReason.trim() || undefined);
      toast({ title: 'Booking declined', description: 'The customer has been notified via SMS.' });
      setRequests((prev) => prev.filter((r) => r.appointment_id !== declineDialogId));
      setDeclineDialogId(null);
      setDeclineReason('');
    } catch (err: any) {
      toast({ title: 'Failed to decline', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setDecliningSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Appointments"
        title="Booking Requests"
        subtitle="Review and respond to incoming booking requests from customers."
        actions={
          <button
            onClick={() => void load()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        }
      />

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <IconClipboardList stroke={1.5} className="h-6 w-6 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">No pending requests</p>
          <p className="mt-1 text-xs text-slate-500">New booking requests from customers will appear here.</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.appointment_id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <IconUser stroke={1.5} className="h-4 w-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{req.contact_name || 'Customer'}</p>
                      {req.contact_phone && (
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <IconPhone stroke={1.5} className="h-3 w-3" />
                          {req.contact_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <IconCalendar stroke={1.5} className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        <span className="font-medium">Requested:</span> {formatDateTime(req.scheduled_start)}
                      </span>
                    </div>
                    {req.service_type && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 shrink-0" />
                        <span><span className="font-medium">Service:</span> {req.service_type}</span>
                      </div>
                    )}
                    {req.address?.street && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          <span className="font-medium">Address:</span>{' '}
                          {[req.address.street, req.address.city, req.address.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {req.notes && (
                      <div className="flex items-start gap-1.5">
                        <span className="h-3.5 w-3.5 shrink-0" />
                        <span><span className="font-medium">Notes:</span> {req.notes}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">Received {formatDate(req.created_at)}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => void handleAccept(req.appointment_id)}
                    disabled={processingId === req.appointment_id}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <IconCheck stroke={2} className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleOpenDecline(req.appointment_id)}
                    disabled={processingId === req.appointment_id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <IconX stroke={2} className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!declineDialogId} onOpenChange={(open) => !open && setDeclineDialogId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline booking request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              The customer will receive an SMS letting them know their request was declined. You can optionally include a reason.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Reason <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. That time slot is no longer available. Please contact us to reschedule."
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeclineDialogId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeclineSubmit()}
                disabled={decliningSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {decliningSubmitting ? 'Declining…' : 'Decline request'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
