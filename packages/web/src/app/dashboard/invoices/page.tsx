'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  IconCurrencyDollar,
  IconFileInvoice,
  IconMail,
  IconPackage,
  IconPlus,
  IconReceipt,
  IconTrash,
  IconCircleCheck,
  IconClock,
} from '@tabler/icons-react';

type Invoice = {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  total_cents: number;
  status: string;
  created_at: number;
  due_date?: number;
};

type InvoiceStats = {
  total_invoices: number;
  paid_invoices: number;
  outstanding_invoices: number;
  total_revenue_cents: number;
  outstanding_amount_cents: number;
};

type BookingService = {
  service_id: string;
  name: string;
  description?: string;
  amount_cents: number;
  currency?: string;
  active?: boolean;
  billing_type?: 'ONE_TIME' | 'SUBSCRIPTION';
  billing_interval?: 'day' | 'week' | 'month' | 'year';
  billing_interval_count?: number;
};

type Company = {
  company_name?: string;
  email?: string;
  booking_from_email?: string;
  email_from?: string;
  booking_services?: BookingService[];
};

type DraftLineItem = {
  id: string;
  selection: string;
  description: string;
  amount: string;
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  VIEWED: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  CANCELLED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
};

const CUSTOM_OPTION = 'CUSTOM';

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function createDraftItem(): DraftLineItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    selection: CUSTOM_OPTION,
    description: '',
    amount: '',
  };
}

function billingLabel(service: BookingService) {
  if (service.billing_type === 'SUBSCRIPTION') {
    const interval = service.billing_interval || 'month';
    const count = Math.max(1, Number(service.billing_interval_count || 1));
    return count === 1 ? `Subscription · per ${interval}` : `Subscription · every ${count} ${interval}s`;
  }
  return 'One-time payment';
}

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    notes: '',
    line_items: [createDraftItem()] as DraftLineItem[],
  });

  const activeServices = useMemo(
    () => (Array.isArray(company?.booking_services) ? company.booking_services.filter((service) => service?.active !== false) : []),
    [company],
  );

  const replyToEmail = company?.booking_from_email || company?.email_from || company?.email || 'hello@handycall.org';

  const load = async () => {
    setLoading(true);
    try {
      const [list, s, myCompany] = await Promise.all([
        (apiClient as any).get('/invoices?limit=50'),
        (apiClient as any).get('/invoices/stats'),
        apiClient.getMyCompany(),
      ]);
      setInvoices(Array.isArray(list) ? list : []);
      setStats(s);
      setCompany(myCompany || null);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm({
      customer_name: '',
      customer_email: '',
      notes: '',
      line_items: [createDraftItem()],
    });
  };

  const applySelection = (itemId: string, value: string) => {
    setForm((current) => ({
      ...current,
      line_items: current.line_items.map((item) => {
        if (item.id !== itemId) return item;
        if (value === CUSTOM_OPTION) {
          return { ...item, selection: value, description: '', amount: '' };
        }
        const service = activeServices.find((entry) => entry.service_id === value);
        if (!service) return item;
        return {
          ...item,
          selection: value,
          description: service.description?.trim() || service.name,
          amount: (service.amount_cents / 100).toFixed(2),
        };
      }),
    }));
  };

  const updateLineItem = (itemId: string, field: keyof DraftLineItem, value: string | number) => {
    setForm((current) => ({
      ...current,
      line_items: current.line_items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  };

  const addLineItem = () => {
    setForm((current) => ({
      ...current,
      line_items: [...current.line_items, createDraftItem()],
    }));
  };

  const removeLineItem = (itemId: string) => {
    setForm((current) => ({
      ...current,
      line_items: current.line_items.filter((item) => item.id !== itemId),
    }));
  };

  const total = useMemo(
    () =>
      form.line_items.reduce((sum, item) => {
        const unit = Number.parseFloat(item.amount || '0');
        return sum + Math.round((Number.isFinite(unit) ? unit : 0) * 100);
      }, 0),
    [form.line_items],
  );

  const handleCreate = async () => {
    if (!form.customer_name.trim()) {
      toast({ title: 'Customer name is required', variant: 'destructive' });
      return;
    }

    const normalizedLineItems = form.line_items
      .map((item) => ({
        description: item.description.trim(),
        quantity: 1,
        unit_price_cents: Math.max(0, Math.round(Number.parseFloat(item.amount || '0') * 100)),
        ...(item.selection !== CUSTOM_OPTION
          ? {
              service_id: item.selection,
              billing_type: activeServices.find((service) => service.service_id === item.selection)?.billing_type || 'ONE_TIME',
              billing_interval: activeServices.find((service) => service.service_id === item.selection)?.billing_interval,
              billing_interval_count: activeServices.find((service) => service.service_id === item.selection)?.billing_interval_count,
              currency: activeServices.find((service) => service.service_id === item.selection)?.currency || 'usd',
            }
          : { currency: 'usd' }),
      }))
      .filter((item) => item.description);

    if (normalizedLineItems.length === 0) {
      toast({ title: 'Add at least one invoice item', description: 'Each invoice item needs a description.', variant: 'destructive' });
      return;
    }

    if (normalizedLineItems.some((item) => !item.description)) {
      toast({ title: 'Description required', description: 'Every invoice item needs a description.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await (apiClient as any).post('/invoices', {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        line_items: normalizedLineItems,
      });
      toast({ title: 'Invoice created' });
      setShowForm(false);
      resetForm();
      await load();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create invoice', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await (apiClient as any).post(`/invoices/${invoiceId}/paid`);
      toast({ title: 'Invoice marked as paid' });
      await load();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to update invoice', variant: 'destructive' });
    }
  };

  const handleSend = async (invoiceId: string) => {
    try {
      await (apiClient as any).post(`/invoices/${invoiceId}/send`);
      toast({
        title: 'Invoice emailed',
        description: 'The customer received it from no-reply@handycall.org with a payment link.',
      });
      await load();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to send invoice', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        subtitle="Create and manage invoices for your customers."
        actions={
          <Button onClick={() => setShowForm(true)} size="sm">
            <IconPlus className="mr-1 h-4 w-4" /> New invoice
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total revenue</p>
            <IconCurrencyDollar className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(stats?.total_revenue_cents || 0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats?.paid_invoices || 0} paid invoices</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outstanding</p>
            <IconClock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(stats?.outstanding_amount_cents || 0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats?.outstanding_invoices || 0} unpaid invoices</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total invoices</p>
            <IconFileInvoice className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.total_invoices || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">All time</p>
        </div>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-4xl overflow-hidden border-border bg-card p-0 rounded-[28px]">
          <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
            <div className="border-b border-border bg-[linear-gradient(180deg,#eef9f1_0%,#f8fbf8_100%)] dark:bg-slate-800/60 p-6 lg:border-b-0 lg:border-r dark:lg:border-slate-800">
              <DialogHeader className="space-y-3 text-left">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <IconReceipt className="h-5 w-5" />
                </div>
                <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">Create invoice</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-muted-foreground">
                  Pick one of your payment offerings or bill for a custom amount. Description is always required so the customer
                  knows exactly what this invoice covers.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-card p-4">
                  <div className="flex items-start gap-3">
                    <IconMail className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Invoice delivery</p>
                      <p className="mt-1 text-sm text-muted-foreground">Sent from no-reply@handycall.org</p>
                      <p className="text-xs text-muted-foreground">Customer replies go to {replyToEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <IconPackage className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Available invoice items</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeServices.length > 0
                          ? `${activeServices.length} saved service or plan options pulled from your payment setup.`
                          : 'No saved payment options yet. You can still invoice any custom amount with Other (Customer).'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <IconCurrencyDollar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Best practice</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Use a saved plan or service whenever possible so the invoice amount stays aligned with your configured
                        pricing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-h-[85vh] overflow-y-auto p-6">
              <div className="space-y-6">
                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-foreground">Customer details</p>
                    <p className="mt-1 text-sm text-muted-foreground">This is who will receive the invoice email.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="invoice-customer-name" className="text-foreground">Customer name</Label>
                      <Input
                        id="invoice-customer-name"
                        placeholder="John Smith"
                        value={form.customer_name}
                        onChange={(e) => setForm((current) => ({ ...current, customer_name: e.target.value }))}
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoice-customer-email" className="text-foreground">Customer email</Label>
                      <Input
                        id="invoice-customer-email"
                        type="email"
                        placeholder="john@example.com"
                        value={form.customer_email}
                        onChange={(e) => setForm((current) => ({ ...current, customer_email: e.target.value }))}
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Invoice items</p>
                      <p className="mt-1 text-sm text-muted-foreground">Select a saved service or choose Other (Customer) for a manual amount.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                      <IconPlus className="mr-1 h-4 w-4" /> Add item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {form.line_items.map((item, index) => {
                      const selectedService = activeServices.find((service) => service.service_id === item.selection);
                      const isCustom = item.selection === CUSTOM_OPTION;
                      return (
                        <div key={item.id} className="rounded-[24px] border border-border bg-slate-50/70 dark:bg-slate-800/50 p-4 shadow-sm">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Item {index + 1}</p>
                              <p className="mt-1 text-sm font-medium text-foreground">
                                {isCustom ? 'Custom customer charge' : selectedService ? billingLabel(selectedService) : 'Saved payment option'}
                              </p>
                            </div>
                            {form.line_items.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="rounded-full text-muted-foreground hover:text-red-600 dark:hover:text-red-400">
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-[1.15fr_160px]">
                            <div className="space-y-2">
                              <Label className="text-foreground">What are you invoicing for?</Label>
                              <Select value={item.selection} onValueChange={(value) => applySelection(item.id, value)}>
                                <SelectTrigger className="h-12 rounded-2xl border-border bg-card text-foreground">
                                  <SelectValue placeholder="Select a saved service or custom amount" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  {activeServices.map((service) => (
                                    <SelectItem key={service.service_id} value={service.service_id} className="text-foreground">
                                      {service.name} · {formatMoney(service.amount_cents)}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value={CUSTOM_OPTION} className="text-foreground">Other (Customer)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-foreground">Amount</Label>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.amount}
                                  onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                                  className="h-12 rounded-2xl border-border bg-card dark:text-slate-100 pl-8"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <Label className="text-foreground">Description</Label>
                            <Textarea
                              rows={3}
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              className="min-h-[110px] rounded-2xl border-border bg-card dark:text-slate-100"
                              placeholder={
                                isCustom
                                  ? 'Describe what this customer is being charged for.'
                                  : 'Explain what this invoice item covers.'
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Required. Keep this customer-facing so they understand exactly what they are paying for.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">Invoice total</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{formatMoney(total)}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Descriptions are required</p>
                        <p>Customer email is needed to send</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-foreground">Internal notes</p>
                    <p className="mt-1 text-sm text-muted-foreground">Optional notes or payment terms shown on the invoice email.</p>
                  </div>
                  <Textarea
                    rows={4}
                    className="rounded-2xl border-border bg-card dark:text-slate-100"
                    placeholder="Example: Payment due within 7 days. Reply if you need an updated copy."
                    value={form.notes}
                    onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  />
                </section>
              </div>

              <DialogFooter className="mt-6 gap-2 border-t border-border pt-5 sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  The invoice can be created as a draft first, then emailed to the customer when you click Send.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={saving || !form.customer_name.trim()}>
                    {saving ? 'Creating…' : 'Create invoice'}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<IconFileInvoice className="h-6 w-6 text-muted-foreground" />}
          title="No invoices yet"
          description="Create your first invoice to start billing customers."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">
          {invoices.map((inv) => (
            <div key={inv.invoice_id} className="flex items-center gap-4 px-5 py-4 hover:border-slate-200 dark:hover:border-slate-700 transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{inv.invoice_number}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[inv.status] || STATUS_STYLES.DRAFT}`}>
                    {inv.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{inv.customer_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
              <p className="text-sm font-bold text-foreground">{formatMoney(inv.total_cents)}</p>
              <div className="flex gap-1">
                {inv.status === 'DRAFT' && (
                  <Button size="sm" variant="outline" onClick={() => handleSend(inv.invoice_id)}>
                    <IconMail className="mr-1 h-3 w-3" /> Send
                  </Button>
                )}
                {(inv.status === 'SENT' || inv.status === 'VIEWED' || inv.status === 'OVERDUE') && (
                  <Button size="sm" onClick={() => handleMarkPaid(inv.invoice_id)}>
                    <IconCircleCheck className="mr-1 h-3 w-3" /> Mark paid
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
