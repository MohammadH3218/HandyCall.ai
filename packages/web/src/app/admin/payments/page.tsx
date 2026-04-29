'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconExternalLink, IconRefresh, IconSearch } from '@tabler/icons-react';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { apiClient } from '@/lib/api-client';
import { formatDateTime, formatHalalaAsSar } from '@/lib/admin-format';

const FILTERS = ['ALL', 'UNBILLED', 'INVOICED', 'INITIATED', 'PAID', 'REFUNDED', 'FAILED'];

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listAdminPayments({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
        limit: 100,
      });
      setPayments(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const refund = async (invoiceId: string) => {
    await apiClient.refundAdminBillingInvoice(invoiceId, {
      reason: 'Refund issued by HandyCall admin',
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Payments"
        subtitle="Track pro lead-fee charges, Moyasar invoices, saved-card billing, and refund outcomes."
        actions={
          <Button variant="outline" onClick={() => void load()}>
            <IconRefresh className="mr-2 h-4 w-4" stroke={1.6} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={status === filter ? 'default' : 'outline'}
            onClick={() => setStatus(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" stroke={1.7} />
          <Input
            className="pl-9"
            placeholder="Search by pro, invoice, quote, transaction, status, or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button onClick={() => void load()}>Search</Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <DataTable
        loading={loading}
        rows={payments}
        rowKey={(item) => item.invoice_id || item.transaction_id}
        emptyTitle="No payment records found"
        emptyDescription="Pro lead-fee charges and Moyasar invoices matching the current filter will appear here."
        columns={[
          {
            key: 'record',
            header: 'Record',
            render: (item) => (
              <div>
                <p className="font-semibold text-slate-900">
                  {item.record_type === 'INVOICE' ? 'Moyasar invoice' : 'Lead fee'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.invoice_id || item.transaction_id}
                </p>
              </div>
            ),
          },
          {
            key: 'pro',
            header: 'Pro',
            render: (item) => (
              <Link href={`/admin/pros/${item.pro_id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                {item.pro_id?.slice(0, 8) || 'Unknown'}
              </Link>
            ),
          },
          {
            key: 'description',
            header: 'Description',
            render: (item) => (
              <div>
                <p>{item.description || item.period_label || 'Monthly lead fees'}</p>
                {item.hosted_invoice_url ? (
                  <a
                    href={item.hosted_invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
                  >
                    Open Moyasar invoice
                    <IconExternalLink className="h-3 w-3" stroke={1.8} />
                  </a>
                ) : null}
              </div>
            ),
          },
          {
            key: 'amount',
            header: 'Amount',
            render: (item) => formatHalalaAsSar(item.amount_halalas || item.total),
          },
          {
            key: 'status',
            header: 'Status',
            render: (item) => <StatusBadge status={item.status || item.billing_status} />,
          },
          {
            key: 'created',
            header: 'Created',
            render: (item) => formatDateTime(item.created_at),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (item) => (
              <div className="flex flex-wrap gap-2">
                {item.record_type === 'INVOICE' && item.status === 'PAID' ? (
                  <ConfirmActionDialog
                    trigger={
                      <Button size="sm" variant="outline">
                        Refund
                      </Button>
                    }
                    title="Refund invoice?"
                    description="This records the refund in HandyCall and asks Moyasar to refund the captured payment when a payment id is available."
                    confirmLabel="Refund"
                    onConfirm={() => refund(item.invoice_id)}
                  />
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
