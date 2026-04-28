'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { apiClient } from '@/lib/api-client';
import {
  formatDateTime,
  formatHalalaAsSar,
  formatPersonName,
} from '@/lib/admin-format';

const FILTERS = ['ALL', 'PENDING', 'HELD', 'RELEASED', 'REFUNDED'];

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
        limit: 60,
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

  const release = async (bookingId: string) => {
    await apiClient.releaseAdminPayment(bookingId);
    await load();
  };

  const refund = async (bookingId: string) => {
    await apiClient.refundAdminPayment(bookingId, 'Refund recorded by admin');
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Payments"
        subtitle="Monitor booking payment state, release held payouts, and record refunds where the current payment flow allows."
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

      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" stroke={1.7} />
          <Input
            className="pl-9"
            placeholder="Search by booking id, names, email, or payment reference"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button onClick={() => void load()}>Search</Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <DataTable
        loading={loading}
        rows={payments}
        rowKey={(item) => item.booking_id}
        emptyTitle="No payments found"
        emptyDescription="Payment activity matching the current filter will appear here."
        columns={[
          {
            key: 'booking',
            header: 'Booking',
            render: (item) => (
              <div>
                <Link href={`/admin/bookings/${item.booking_id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                  {item.booking_id.slice(0, 8)}
                </Link>
                <p className="text-xs text-muted-foreground">{item.payment_reference || 'No reference yet'}</p>
              </div>
            ),
          },
          {
            key: 'participants',
            header: 'Participants',
            render: (item) => (
              <div>
                <p>{formatPersonName(item.customer)}</p>
                <p className="text-xs text-muted-foreground">{formatPersonName(item.pro)}</p>
              </div>
            ),
          },
          {
            key: 'amount',
            header: 'Amounts',
            render: (item) => (
              <div>
                <p>{formatHalalaAsSar(item.service_price_sar)}</p>
                <p className="text-xs text-muted-foreground">
                  payout {formatHalalaAsSar(item.pro_payout_sar)}
                </p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Payment',
            render: (item) => <StatusBadge status={item.payment_status} />,
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
                {item.payment_status === 'HELD' ? (
                  <Button size="sm" onClick={() => void release(item.booking_id)}>
                    Release payout
                  </Button>
                ) : null}
                {item.payment_status !== 'REFUNDED' ? (
                  <ConfirmActionDialog
                    trigger={
                      <Button size="sm" variant="outline">
                        Refund
                      </Button>
                    }
                    title="Record refund?"
                    description="This records a refund state in the platform. Gateway-side automation is still limited by the current payments implementation."
                    confirmLabel="Record refund"
                    onConfirm={() => refund(item.booking_id)}
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
