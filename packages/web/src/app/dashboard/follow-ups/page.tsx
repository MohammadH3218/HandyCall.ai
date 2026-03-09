'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { IconMessage } from '@tabler/icons-react';

type FollowUpSettings = {
  follow_up_sequences_enabled: boolean;
  follow_up_initial_template?: string;
  follow_up_initial_delay_minutes?: number;
  follow_up_second_template?: string;
  follow_up_second_delay_minutes?: number;
  follow_up_final_template?: string;
  follow_up_final_delay_minutes?: number;
  review_request_enabled?: boolean;
  review_request_template?: string;
  review_request_delay_minutes?: number;
  review_platform_url?: string;
};

type Sequence = {
  sequence_id: string;
  to_number: string;
  status: string;
  created_at: number;
  steps: Array<{ step: number; send_at: number; body: string }>;
};

const FOLLOW_UP_BLOCKS = [
  { key: 'follow_up_initial', title: 'First message', fallbackDelay: 0, fallbackText: "Thanks for calling {{company_name}}! Here's your booking link: {{booking_link}}" },
  { key: 'follow_up_second', title: 'Second message', fallbackDelay: 1440, fallbackText: "Haven't booked yet? We'd love to help. {{booking_link}}" },
  { key: 'follow_up_final', title: 'Final message', fallbackDelay: 4320, fallbackText: 'Final follow-up from {{company_name}}. Reply if you would like to reserve a time.' },
] as const;

const FRIENDLY_TOKENS = {
  '[Customer name]': '{{contact_name}}',
  '[Company name]': '{{company_name}}',
  '[Booking link]': '{{booking_link}}',
} as const;

function toFriendlyTemplate(value?: string) {
  let next = String(value || '');
  Object.entries(FRIENDLY_TOKENS).forEach(([friendly, raw]) => {
    next = next.split(raw).join(friendly);
  });
  return next;
}

function toApiTemplate(value?: string) {
  let next = String(value || '');
  Object.entries(FRIENDLY_TOKENS).forEach(([friendly, raw]) => {
    next = next.split(friendly).join(raw);
  });
  return next;
}

function renderTemplatePreview(
  value: string,
  replacements: { customerName: string; companyName: string; bookingLink: string }
) {
  return toApiTemplate(value)
    .split('{{contact_name}}').join(replacements.customerName)
    .split('{{company_name}}').join(replacements.companyName)
    .split('{{booking_link}}').join(replacements.bookingLink);
}

export default function FollowUpsPage() {
  const { toast } = useToast();
  const { hasFeature } = usePlanFeatures();
  const [settings, setSettings] = useState<FollowUpSettings | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [previewContactId, setPreviewContactId] = useState('NONE');
  const [previewAppointmentId, setPreviewAppointmentId] = useState('NONE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSettings, setEditSettings] = useState<FollowUpSettings | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 1);
      const [company, seqData, contactsData, appointmentsData] = await Promise.all([
        (apiClient as any).get('/companies/me'),
        (apiClient as any).get('/follow-up-sequences').catch(() => ({ items: [] })),
        apiClient.getContacts(200).catch(() => ({ contacts: [] })),
        apiClient.getAppointmentsRange(start.toISOString(), end.toISOString()).catch(() => ({ appointments: [] })),
      ]);
      const nextSettings: FollowUpSettings = {
        follow_up_sequences_enabled: company?.follow_up_sequences_enabled || false,
        follow_up_initial_template: company?.follow_up_initial_template || '',
        follow_up_initial_delay_minutes: company?.follow_up_initial_delay_minutes ?? 0,
        follow_up_second_template: company?.follow_up_second_template || '',
        follow_up_second_delay_minutes: company?.follow_up_second_delay_minutes ?? 1440,
        follow_up_final_template: company?.follow_up_final_template || '',
        follow_up_final_delay_minutes: company?.follow_up_final_delay_minutes ?? 4320,
        review_request_enabled: company?.review_request_enabled || false,
        review_request_template: company?.review_request_template || '',
        review_request_delay_minutes: company?.review_request_delay_minutes ?? 120,
        review_platform_url: company?.review_platform_url || '',
      };
      setCompany(company);
      setSettings(nextSettings);
      setEditSettings(nextSettings);
      setSequences(Array.isArray(seqData) ? seqData : seqData?.items || []);
      setContacts(Array.isArray(contactsData?.contacts) ? contactsData.contacts : []);
      setAppointments(Array.isArray(appointmentsData?.appointments) ? appointmentsData.appointments : []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load follow-up settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (!hasFeature('follow_up_sequences')) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-6">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">Follow-ups are available on Pro and Max</h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          Upgrade your plan to enable automated follow-up sequences and review requests.
        </p>
        <Button className="mt-4" onClick={() => (window.location.href = '/dashboard/billing/plans')}>
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!editSettings) return;
    setSaving(true);
    try {
      const payload: FollowUpSettings = {
        ...editSettings,
        follow_up_initial_template: toApiTemplate(editSettings.follow_up_initial_template || ''),
        follow_up_second_template: toApiTemplate(editSettings.follow_up_second_template || ''),
        follow_up_final_template: toApiTemplate(editSettings.follow_up_final_template || ''),
        review_request_template: toApiTemplate(editSettings.review_request_template || ''),
      };
      await (apiClient as any).put('/companies/me', payload);
      setSettings({ ...payload });
      setEditing(false);
      toast({ title: 'Settings saved', description: 'Your follow-up automation has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditSettings(settings);
    setEditing(false);
  };

  const selectedContact = contacts.find((contact: any) => String(contact.contact_id) === previewContactId);
  const contactAppointments = useMemo(
    () =>
      appointments
        .filter((appointment: any) => selectedContact && appointment.contact_id === selectedContact.contact_id)
        .sort((a: any, b: any) => Number(a.scheduled_start || 0) - Number(b.scheduled_start || 0)),
    [appointments, selectedContact]
  );
  const selectedAppointment = contactAppointments.find((appointment: any) => appointment.appointment_id === previewAppointmentId);

  const previewMessage = (value?: string, fallback?: string) =>
    renderTemplatePreview(toFriendlyTemplate(value || fallback || ''), {
      customerName: selectedContact?.name || selectedContact?.first_name || 'Customer',
      companyName: company?.company_name || 'Your company',
      bookingLink: selectedAppointment?.booking_link || 'your booking link',
    });

  if (loading || !settings || !editSettings) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Follow-up Sequences"
        subtitle="Keep leads warm automatically without making this page feel like a spreadsheet."
        actions={editing ? undefined : <Button onClick={() => setEditing(true)}>Edit automation</Button>}
      />

      {/* Summary card */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recommended starter flow</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">A simple setup most service businesses can start with immediately.</p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Automation</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{settings.follow_up_sequences_enabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          {FOLLOW_UP_BLOCKS.map((block) => (
            <div key={block.key} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{block.title}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {Number((settings as any)[`${block.key}_delay_minutes`] ?? block.fallbackDelay)} min
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                {toFriendlyTemplate((settings as any)[`${block.key}_template`] || block.fallbackText)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Automation setup card */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Automation setup</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Edit only when you want to fine-tune timing or wording.</p>
        </div>
        {!editing ? (
          <div className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              {FOLLOW_UP_BLOCKS.map((block) => (
                <div key={block.key} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{block.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Sends after {Number((settings as any)[`${block.key}_delay_minutes`] ?? block.fallbackDelay)} minutes
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                    {previewMessage((settings as any)[`${block.key}_template`], block.fallbackText)}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Review requests</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {settings.review_request_enabled ? `Enabled after ${settings.review_request_delay_minutes} minutes` : 'Disabled'}
                </p>
                <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                  {settings.review_platform_url || 'No review link set yet.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            {/* Preview picker */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview your follow-up messages</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pick a customer and booking so you can see exactly what the text will look like.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Customer</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={previewContactId}
                    onChange={(e) => {
                      setPreviewContactId(e.target.value);
                      setPreviewAppointmentId('NONE');
                    }}
                  >
                    <option value="NONE">Choose a customer</option>
                    {contacts.map((contact: any) => (
                      <option key={contact.contact_id} value={contact.contact_id}>
                        {contact.name || 'Unnamed customer'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Booking</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={previewAppointmentId}
                    onChange={(e) => setPreviewAppointmentId(e.target.value)}
                    disabled={!selectedContact}
                  >
                    <option value="NONE">{selectedContact ? 'Choose a booking' : 'Choose a customer first'}</option>
                    {contactAppointments.map((appointment: any) => (
                      <option key={appointment.appointment_id} value={appointment.appointment_id}>
                        {new Date(appointment.scheduled_start).toLocaleString()} · {appointment.service_type || 'Appointment'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable follow-up automation</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Use a simple 3-touch sequence for leads who have not booked yet.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditSettings((s) => (s ? { ...s, follow_up_sequences_enabled: !s.follow_up_sequences_enabled } : s))}
                className={`relative h-7 w-12 rounded-full transition ${editSettings.follow_up_sequences_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${editSettings.follow_up_sequences_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Message blocks */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FOLLOW_UP_BLOCKS.map((block) => (
                <div key={block.key} className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{block.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Write it in plain language. Use the quick insert buttons if you want the customer's name or booking link to appear automatically.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Delay in minutes</label>
                    <Input
                      type="number"
                      min={0}
                      value={(editSettings as any)[`${block.key}_delay_minutes`] ?? block.fallbackDelay}
                      onChange={(e) => setEditSettings((s) => (s ? { ...s, [`${block.key}_delay_minutes`]: Number(e.target.value) } : s))}
                      className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Message</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(FRIENDLY_TOKENS).map((token) => (
                        <button
                          key={token}
                          type="button"
                          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                          onClick={() =>
                            setEditSettings((s) =>
                              s
                                ? {
                                    ...s,
                                    [`${block.key}_template`]: s[`${block.key}_template` as keyof FollowUpSettings]
                                      ? `${String(s[`${block.key}_template` as keyof FollowUpSettings])} ${token}`
                                      : token,
                                  }
                                : s
                            )
                          }
                        >
                          Insert {token.replace(/^\[|\]$/g, '')}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={toFriendlyTemplate(block.fallbackText)}
                      value={toFriendlyTemplate((editSettings as any)[`${block.key}_template`] || '')}
                      onChange={(e) => setEditSettings((s) => (s ? { ...s, [`${block.key}_template`]: e.target.value } : s))}
                    />
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Preview</p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{previewMessage((editSettings as any)[`${block.key}_template`], block.fallbackText)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Review requests */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Review requests</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Ask for a review after completed jobs.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditSettings((s) => (s ? { ...s, review_request_enabled: !s.review_request_enabled } : s))}
                  className={`relative h-7 w-12 rounded-full transition ${editSettings.review_request_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${editSettings.review_request_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Review link</label>
                  <Input
                    placeholder="https://g.page/r/your-review-link"
                    value={editSettings.review_platform_url || ''}
                    onChange={(e) => setEditSettings((s) => (s ? { ...s, review_platform_url: e.target.value } : s))}
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Send delay in minutes</label>
                  <Input
                    type="number"
                    min={0}
                    value={editSettings.review_request_delay_minutes ?? 120}
                    onChange={(e) => setEditSettings((s) => (s ? { ...s, review_request_delay_minutes: Number(e.target.value) } : s))}
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button variant="outline" onClick={handleCancel}
                className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
            </div>
          </div>
        )}
      </div>

      {/* Recent sequences */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent sequences</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Follow-up sequences sent to leads</p>
        </div>
        {sequences.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IconMessage stroke={1.5} className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
              title="No sequences yet"
              description="Follow-up sequences will appear here after calls with new leads."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sequences.slice(0, 20).map((seq) => (
              <div key={seq.sequence_id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{seq.to_number}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{seq.steps?.length || 0} messages · {new Date(seq.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  seq.status === 'SCHEDULED'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : seq.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {seq.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
