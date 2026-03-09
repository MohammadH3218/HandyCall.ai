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
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';

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

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    APPOINTMENT_REMINDER: 'bg-blue-100 text-blue-700',
    FOLLOW_UP: 'bg-emerald-100 text-emerald-700',
    PROMOTIONAL: 'bg-amber-100 text-amber-700',
    REVIEW_REQUEST: 'bg-violet-100 text-violet-700',
    CUSTOM: 'bg-slate-100 text-slate-700',
  };
  const label = CATEGORIES.find((c) => c.value === category)?.label || category;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[category] || 'bg-slate-100 text-slate-700'}`}>
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'CUSTOM', body: '' });
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
    await Promise.all([loadTemplates(), loadScheduled()]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (!hasFeature('follow_up_sequences')) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">SMS Automation is available on Pro and Max</h2>
        <p className="mt-1 text-sm text-amber-800">
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
      await (apiClient as any).post('/sms-automation/templates', form);
      toast({ title: 'Template created', description: 'Your SMS template is ready to use.' });
      setShowForm(false);
      setForm({ name: '', category: 'CUSTOM', body: '' });
      await loadTemplates();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
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
              <Plus className="mr-1 h-4 w-4" /> New template
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {STARTER_CARDS.map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{card.title}</p>
            <p className="mt-1 text-sm text-slate-600">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="flex w-fit gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
        {(['templates', 'scheduled'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'templates' ? `Templates (${templates.length})` : `Scheduled (${scheduled.length})`}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        templates.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6 text-slate-400" />}
            title="No templates yet"
            description="Create your first SMS template to speed up reminders and follow-ups."
          />
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-100">
            {templates.map((t) => (
              <div key={t.template_id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <CategoryBadge category={t.category} />
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600">{t.body}</p>
                </div>
                <button onClick={() => handleDelete(t.template_id)} className="text-slate-400 transition hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'scheduled' && (
        scheduled.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6 text-slate-400" />}
            title="No scheduled messages"
            description="Scheduled SMS messages will appear here."
          />
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-100">
            {scheduled.map((m) => (
              <div key={m.message_id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{m.to_number}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {m.message_type}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600">{m.body}</p>
                  <p className="mt-1 text-xs text-slate-400">Sends {new Date(m.send_at).toLocaleString()}</p>
                </div>
                <button onClick={() => handleCancelScheduled(m.message_id)} className="text-slate-400 transition hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create SMS template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              Keep it short and conversational. Use placeholders like {'{{contact_name}}'} and {'{{booking_link}}'} when useful.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Template name</label>
                <Input
                  placeholder="Appointment reminder"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Category</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <label className="mb-1 block text-xs font-medium text-slate-700">Message body</label>
              <textarea
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Hi {{contact_name}}, this is {{company_name}} checking in about your appointment..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">Available variables: {'{{contact_name}}'}, {'{{company_name}}'}, {'{{booking_link}}'}</p>
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
