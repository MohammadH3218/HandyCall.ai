'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { IconMessageDots, IconPlus, IconTrash, IconX } from '@tabler/icons-react';

type SmsTemplate = {
  template_id: string;
  name: string;
  category: string;
  body: string;
  created_at: number;
};

type ScheduledMessage = {
  message_id: string;
  to_number: string;
  body: string;
  send_at: number;
  status: string;
  message_type: string;
};

const CATEGORIES = [
  { value: 'APPOINTMENT_REMINDER', label: 'Appointment Reminder' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'PROMOTIONAL', label: 'Promotional' },
  { value: 'REVIEW_REQUEST', label: 'Review Request' },
  { value: 'CUSTOM', label: 'Custom' },
];

const STARTER_CARDS = [
  {
    title: 'Appointment reminders',
    body: 'Use this for confirmations, reminders, and reschedule links.',
  },
  {
    title: 'Lead follow-ups',
    body: 'Send a light follow-up after a missed booking or estimate request.',
  },
  {
    title: 'Review requests',
    body: 'Ask happy customers for a review after the job is done.',
  },
];

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

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    APPOINTMENT_REMINDER: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    FOLLOW_UP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    PROMOTIONAL: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    REVIEW_REQUEST: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    CUSTOM: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  const label = CATEGORIES.find((c) => c.value === category)?.label || category;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[category] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
      {label}
    </span>
  );
}

export default function SmsAutomationPage() {
  const { toast } = useToast();
  const { hasFeature } = usePlanFeatures();
  const [tab, setTab] = useState<'templates' | 'scheduled'>('templates');
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'CUSTOM', body: '' });
  const [previewContactId, setPreviewContactId] = useState('NONE');
  const [previewAppointmentId, setPreviewAppointmentId] = useState('NONE');
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    try {
      const data = await (apiClient as any).get('/sms-automation/templates');
      setTemplates(Array.isArray(data) ? data : data?.items || []);
    } catch {
      // ignore
    }
  };

  const loadScheduled = async () => {
    try {
      const data = await (apiClient as any).get('/sms-automation/scheduled?status=PENDING&limit=50');
      setScheduled(Array.isArray(data) ? data : data?.items || []);
    } catch {
      // ignore
    }
  };

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);
    await Promise.all([
      loadTemplates(),
      loadScheduled(),
      apiClient.getMyCompany().then(setCompany).catch(() => null),
      apiClient.getContacts(200).then((data) => setContacts(Array.isArray(data?.contacts) ? data.contacts : [])).catch(() => setContacts([])),
      apiClient.getAppointmentsRange(start.toISOString(), end.toISOString())
        .then((data) => setAppointments(Array.isArray(data?.appointments) ? data.appointments : []))
        .catch(() => setAppointments([])),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (!hasFeature('follow_up_sequences')) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-6">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-300">SMS Automation is available on Pro and Max</h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
          Upgrade your plan to create templates and run automated SMS campaigns.
        </p>
        <Button className="mt-4" onClick={() => (window.location.href = '/dashboard/billing/plans')}>
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!form.name || !form.body) return;
    setSaving(true);
    try {
      await (apiClient as any).post('/sms-automation/templates', {
        ...form,
        body: toApiTemplate(form.body),
      });
      toast({ title: 'Template created', description: 'Your SMS template is ready to use.' });
      setShowForm(false);
      setForm({ name: '', category: 'CUSTOM', body: '' });
      setPreviewContactId('NONE');
      setPreviewAppointmentId('NONE');
      await loadTemplates();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedContact = contacts.find((contact: any) => String(contact.contact_id) === previewContactId);
  const contactAppointments = appointments
    .filter((appointment: any) => {
      if (!selectedContact) return false;
      return appointment.contact_id === selectedContact.contact_id;
    })
    .sort((a: any, b: any) => Number(a.scheduled_start || 0) - Number(b.scheduled_start || 0));
  const selectedAppointment = contactAppointments.find((appointment: any) => appointment.appointment_id === previewAppointmentId);
  const previewBody = renderTemplatePreview(form.body, {
    customerName: selectedContact?.name || selectedContact?.first_name || 'Customer',
    companyName: company?.company_name || 'Your company',
    bookingLink: selectedAppointment?.booking_link || 'your booking link',
  });

  const handleDelete = async (templateId: string) => {
    try {
      await (apiClient as any).delete(`/sms-automation/templates/${templateId}`);
      toast({ title: 'Template deleted', description: 'The template was removed.' });
      await loadTemplates();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete template', variant: 'destructive' });
    }
  };

  const handleCancelScheduled = async (messageId: string) => {
    try {
      await (apiClient as any).delete(`/sms-automation/scheduled/${messageId}`);
      toast({ title: 'Message cancelled', description: 'The scheduled SMS was cancelled.' });
      await loadScheduled();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to cancel message', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SMS"
        title="SMS Automation"
        subtitle="Create templates once, then reuse them across reminders, follow-ups, and review requests."
        actions={
          tab === 'templates' ? (
            <Button onClick={() => setShowForm(true)} size="sm">
              <IconPlus className="mr-1 h-4 w-4" /> New template
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {STARTER_CARDS.map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{card.title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="flex w-fit gap-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
        {(['templates', 'scheduled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === t
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t === 'templates' ? `Templates (${templates.length})` : `Scheduled (${scheduled.length})`}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        templates.length === 0 ? (
          <EmptyState
            icon={<IconMessageDots className="h-6 w-6 text-slate-400 dark:text-slate-500" />}
            title="No templates yet"
            description="Create your first SMS template to speed up reminders and follow-ups."
          />
        ) : (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {templates.map((t) => (
              <div key={t.template_id} className="flex items-start gap-4 px-5 py-4 hover:border-slate-200 dark:hover:border-slate-700 transition">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                    <CategoryBadge category={t.category} />
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{toFriendlyTemplate(t.body)}</p>
                </div>
                <button onClick={() => handleDelete(t.template_id)} className="text-slate-400 dark:text-slate-500 transition hover:text-red-600 dark:hover:text-red-400">
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'scheduled' && (
        scheduled.length === 0 ? (
          <EmptyState
            icon={<IconMessageDots className="h-6 w-6 text-slate-400 dark:text-slate-500" />}
            title="No scheduled messages"
            description="Scheduled SMS messages will appear here."
          />
        ) : (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {scheduled.map((m) => (
              <div key={m.message_id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.to_number}</p>
                    <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {m.message_type}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{m.body}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Sends {new Date(m.send_at).toLocaleString()}</p>
                </div>
                <button onClick={() => handleCancelScheduled(m.message_id)} className="text-slate-400 dark:text-slate-500 transition hover:text-red-600 dark:hover:text-red-400">
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Create SMS template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
              Write the message the way you want it to sound. You can optionally insert the customer name, your company name, or a booking link without dealing with template code.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Template name</label>
                <Input
                  placeholder="Appointment reminder"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
                <select
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Message body</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {Object.keys(FRIENDLY_TOKENS).map((token) => (
                  <button
                    key={token}
                    type="button"
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        body: prev.body ? `${prev.body} ${token}` : token,
                      }))
                    }
                  >
                    Insert {token.replace(/^\[|\]$/g, '')}
                  </button>
                ))}
              </div>
              <textarea
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Hi [Customer name], this is [Company name] checking in about your appointment."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Keep it short and direct. If you want a pay or booking action, add the booking link button text naturally in the message.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview this message</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose a customer and one of their bookings so you can see the final text before saving.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Customer</label>
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Booking link</label>
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
              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Preview</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{previewBody || 'Your message preview will appear here.'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.name || !form.body}>
                {saving ? 'Creating...' : 'Create template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
