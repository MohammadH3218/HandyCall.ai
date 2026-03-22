'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { IconPhone, IconPhoneOutgoing, IconX } from '@tabler/icons-react';
import { DEMO_OUTBOUND_CALLS, DEMO_CONTACTS } from '@/lib/demo-data';

type OutboundCall = {
  call_id: string;
  twilio_call_sid: string;
  to_number: string;
  from_number: string;
  context: string;
  status: string;
  created_at: number;
  custom_message?: string;
};

const CONTEXT_OPTIONS = [
  {
    value: 'MANUAL',
    label: 'Custom call',
    description: 'Tell the AI in plain English what you want it to call about.',
  },
  {
    value: 'APPOINTMENT_REMINDER',
    label: 'Appointment reminder',
    description: 'Remind the customer about an upcoming booking and confirm they are ready.',
  },
  {
    value: 'FOLLOW_UP',
    label: 'Follow-up',
    description: 'Check back in after a missed booking, estimate, or previous conversation.',
  },
  {
    value: 'REVIEW_REQUEST',
    label: 'Review request',
    description: 'Ask a happy customer for a quick review after their job is complete.',
  },
] as const;

export default function OutboundCallsPage() {
  const { toast } = useToast();
  const { hasFeature } = usePlanFeatures();
  const [calls, setCalls] = useState<OutboundCall[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [calling, setCalling] = useState(false);
  const [form, setForm] = useState({
    selected_contact_id: '',
    selected_appointment_id: '',
    context: 'MANUAL',
    custom_message: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 1);

      const [callsData, contactsData, appointmentsData] = await Promise.all([
        apiClient.getOutboundCalls(50).catch(() => ({ items: [] })),
        apiClient.getContacts(200).catch(() => ({ contacts: [] })),
        apiClient.getAppointmentsRange(start.toISOString(), end.toISOString()).catch(() => ({ appointments: [] })),
      ]);

      const fetchedCalls = Array.isArray((callsData as any)?.items) ? (callsData as any).items : Array.isArray(callsData) ? callsData : [];
      setCalls(fetchedCalls.length > 0 ? fetchedCalls : (DEMO_OUTBOUND_CALLS as unknown as OutboundCall[]));
      const fetchedContacts = Array.isArray(contactsData?.contacts) ? contactsData.contacts : [];
      setContacts(fetchedContacts.length > 0 ? fetchedContacts : DEMO_CONTACTS);
      setAppointments(Array.isArray(appointmentsData?.appointments) ? appointmentsData.appointments : []);
    } catch {
      // keep page usable even if one of the supporting queries fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedContact = useMemo(
    () => contacts.find((contact: any) => String(contact.contact_id) === form.selected_contact_id),
    [contacts, form.selected_contact_id]
  );
  const selectedContactPhone = String(selectedContact?.phone_number || selectedContact?.phone || '').trim();
  const customerAppointments = useMemo(
    () =>
      appointments
        .filter((appointment: any) => selectedContact && appointment.contact_id === selectedContact.contact_id)
        .sort((a: any, b: any) => Number(a.scheduled_start || 0) - Number(b.scheduled_start || 0)),
    [appointments, selectedContact]
  );
  const selectedAppointment = customerAppointments.find(
    (appointment: any) => String(appointment.appointment_id) === form.selected_appointment_id
  );
  const selectedContext = CONTEXT_OPTIONS.find((option) => option.value === form.context) || CONTEXT_OPTIONS[0];

  if (!hasFeature('follow_up_sequences')) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-6">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">Outbound Calls are available on Pro and Max</h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          Upgrade your plan to initiate automation-driven outbound call campaigns.
        </p>
        <Button className="mt-4" onClick={() => (window.location.href = '/dashboard/billing/plans')}>
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  const resetForm = () =>
    setForm({
      selected_contact_id: '',
      selected_appointment_id: '',
      context: 'MANUAL',
      custom_message: '',
    });

  const handleCall = async () => {
    if (!selectedContact) {
      toast({
        title: 'Choose a customer',
        description: 'Select the customer you want the AI to call first.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedContactPhone) {
      toast({
        title: 'Customer has no phone number',
        description: 'Add a phone number on the customer profile before starting an outbound call.',
        variant: 'destructive',
      });
      return;
    }

    if (form.context === 'MANUAL' && !form.custom_message.trim()) {
      toast({
        title: 'Add the call reason',
        description: 'Explain what you want the AI to call the customer about before you start the call.',
        variant: 'destructive',
      });
      return;
    }

    setCalling(true);
    try {
      await apiClient.createOutboundCall({
        to_number: selectedContactPhone,
        context: form.context,
        contact_id: selectedContact.contact_id,
        appointment_id: form.selected_appointment_id || undefined,
        custom_message: form.custom_message.trim() || undefined,
      });
      toast({
        title: 'Call initiated',
        description: `Calling ${selectedContact.name || selectedContactPhone}`,
      });
      setShowForm(false);
      resetForm();
      await load();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to initiate call', variant: 'destructive' });
    } finally {
      setCalling(false);
    }
  };

  const statusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    if (s === 'in-progress' || s === 'ringing' || s === 'queued') return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    if (s === 'busy' || s === 'failed' || s === 'no-answer') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calls"
        title="Outbound Calls"
        subtitle="Use AI to call customers for reminders, follow-ups, updates, and other manual outreach."
        actions={
          <Button onClick={() => setShowForm(true)} size="sm">
            <IconPhoneOutgoing stroke={1.5} className="mr-1 h-4 w-4" /> New call
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-900 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Start an AI outbound call</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the customer, choose the booking if this call is tied to one, and tell the AI what this call needs to accomplish.
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <IconX stroke={1.5} className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Who should the AI call?</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Customer</label>
                    <select
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.selected_contact_id}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          selected_contact_id: e.target.value,
                          selected_appointment_id: '',
                        }))
                      }
                    >
                      <option value="">Choose a customer</option>
                      {contacts.map((contact: any) => {
                        const phone = String(contact.phone_number || contact.phone || '').trim();
                        return (
                          <option key={contact.contact_id} value={contact.contact_id}>
                            {(contact.name || 'Unnamed customer') + (phone ? ` · ${phone}` : '')}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Booking (optional)</label>
                    <select
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.selected_appointment_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, selected_appointment_id: e.target.value }))}
                      disabled={!selectedContact}
                    >
                      <option value="">{selectedContact ? 'No specific booking' : 'Choose a customer first'}</option>
                      {customerAppointments.map((appointment: any) => (
                        <option key={appointment.appointment_id} value={appointment.appointment_id}>
                          {new Date(appointment.scheduled_start).toLocaleString()} · {appointment.service_type || 'Appointment'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer phone</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {selectedContactPhone || 'Select a customer with a saved phone number'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Call type</p>
                    <select
                      className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.context}
                      onChange={(e) => setForm((prev) => ({ ...prev, context: e.target.value }))}
                    >
                      {CONTEXT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{selectedContext.label}</p>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{selectedContext.description}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <label className="text-sm font-semibold text-foreground">
                  {form.context === 'MANUAL' ? 'What should the AI call about?' : 'Extra note for the AI (optional)'}
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Write this the same way you would brief a receptionist. The AI will use it as the reason for the call.
                </p>
                <textarea
                  rows={5}
                  className="mt-3 w-full resize-none rounded-2xl border border-border bg-card px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={
                    form.context === 'MANUAL'
                      ? 'Example: Let them know we need to move tomorrow’s visit to Friday afternoon and ask which time works better.'
                      : 'Example: Remind them the technician is arriving between 1 PM and 3 PM and ask them to confirm someone will be home.'
                  }
                  value={form.custom_message}
                  onChange={(e) => setForm((prev) => ({ ...prev, custom_message: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Call preview</p>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                    <p className="mt-1">{selectedContact?.name || 'No customer selected yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking reference</p>
                    <p className="mt-1">
                      {selectedAppointment
                        ? `${new Date(selectedAppointment.scheduled_start).toLocaleString()} · ${selectedAppointment.service_type || 'Appointment'}`
                        : 'No specific booking selected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What happens if they do not answer</p>
                    <p className="mt-1">If voicemail picks up, the AI will leave a short message instead of hanging up silently.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-emerald-200/70 dark:border-emerald-900/70 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCall}
              disabled={calling || !selectedContactPhone || (form.context === 'MANUAL' && !form.custom_message.trim())}
              size="sm"
            >
              <IconPhone stroke={1.5} className="mr-1 h-4 w-4" />
              {calling ? 'Connecting...' : 'Start call'}
            </Button>
          </div>
        </div>
      )}

      {calls.length === 0 ? (
        <EmptyState
          icon={<IconPhoneOutgoing stroke={1.5} className="h-6 w-6 text-muted-foreground" />}
          title="No outbound calls yet"
          description="Use AI to place appointment reminders, follow-ups, and one-off customer calls."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">
          {calls.map((call) => (
            <div key={call.call_id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{call.to_number}</p>
                <p className="text-xs text-muted-foreground">
                  {(call.context || 'MANUAL').replace(/_/g, ' ')} · {new Date(call.created_at).toLocaleString()}
                </p>
                {call.custom_message ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{call.custom_message}</p>
                ) : null}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(call.status)}`}>
                {call.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
