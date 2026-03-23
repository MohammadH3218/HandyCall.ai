'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/portal/empty-state';
import { PageHeader } from '@/components/portal/page-header';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { buildMarketplaceThreadId, formatMarketplaceUrgency } from '@/lib/marketplace';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconMapPin,
  IconMessageCircle,
  IconPhone,
  IconSearch,
  IconUser,
  IconX,
} from '@tabler/icons-react';

type QuoteRequest = {
  quote_id: string;
  service_category: string;
  job_description: string;
  location_zipcode?: string;
  location_city?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  preferred_date?: string;
  urgency?: string;
  created_at?: number;
};

export default function MarketplaceRequestsPage() {
  const router = useRouter();
  const companyId = useAuthStore((state) => state.company?.company_id);
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const result = await apiClient.getAvailableQuotes();
        if (!mounted) return;
        const nextRequests = Array.isArray(result) ? result : [];
        setRequests(nextRequests);
        setSelectedId(nextRequests[0]?.quote_id || null);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setRequests([]);
        setError(err?.message || 'Failed to load marketplace requests.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((request) =>
      `${request.service_category} ${request.job_description} ${request.location_city || ''} ${
        request.contact_name || ''
      } ${request.contact_email || ''} ${request.contact_phone || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [requests, search]);

  const selectedRequest =
    filteredRequests.find((request) => request.quote_id === selectedId) || filteredRequests[0] || null;

  useEffect(() => {
    if (!selectedRequest) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== selectedRequest.quote_id) {
      setSelectedId(selectedRequest.quote_id);
    }
  }, [selectedId, selectedRequest]);

  const removeRequest = (quoteId: string) => {
    setRequests((current) => current.filter((request) => request.quote_id !== quoteId));
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    setBusyId(selectedRequest.quote_id);
    try {
      await apiClient.respondToQuoteRequest(selectedRequest.quote_id, {
        status: 'DECLINED',
        message: 'Declined by provider',
      });
      removeRequest(selectedRequest.quote_id);
    } catch (err: any) {
      setError(err?.message || 'Could not decline the request.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest || !companyId) return;
    if (!selectedRequest.contact_email) {
      setError('This request is missing a customer email, so a chat thread cannot be started yet.');
      return;
    }

    setBusyId(selectedRequest.quote_id);
    setError(null);

    try {
      const threadId = buildMarketplaceThreadId(companyId, selectedRequest.contact_email);
      const quoteContext = {
        quote_id: selectedRequest.quote_id,
        service_category: selectedRequest.service_category,
        job_description: selectedRequest.job_description,
        location_city: selectedRequest.location_city,
        location_zipcode: selectedRequest.location_zipcode,
        preferred_date: selectedRequest.preferred_date,
        urgency: selectedRequest.urgency,
        contact_name: selectedRequest.contact_name,
        contact_email: selectedRequest.contact_email,
        contact_phone: selectedRequest.contact_phone,
        created_at: selectedRequest.created_at,
      };

      await apiClient.respondToQuoteRequest(selectedRequest.quote_id, {
        status: 'ACCEPTED',
        message: 'Accepted by provider',
      });

      await apiClient.sendProMessage(threadId, {
        message: `Hi ${
          selectedRequest.contact_name || 'there'
        }, thanks for your request. We reviewed the details and would be happy to help. Feel free to send any extra photos or questions here.`,
        customer_email: selectedRequest.contact_email,
        customer_name: selectedRequest.contact_name,
        customer_phone: selectedRequest.contact_phone,
        request_status: 'ACCEPTED',
        quote_context: quoteContext,
      });

      removeRequest(selectedRequest.quote_id);
      router.push(`/dashboard/marketplace/inbox/${threadId}`);
    } catch (err: any) {
      setError(err?.message || 'Could not accept the request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Requests"
        subtitle="Review incoming customer job requests, then accept to start a direct conversation or decline to pass."
        actions={
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {requests.length} open request{requests.length === 1 ? '' : 's'}
          </Badge>
        }
      />

      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requests by service, city, or customer..."
          className="pl-9"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="h-[520px] animate-pulse rounded-3xl bg-muted" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={<IconMessageCircle className="h-6 w-6 text-muted-foreground" />}
          title="No marketplace requests"
          description="New customer job requests will appear here as people contact pros through the marketplace."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const active = request.quote_id === selectedRequest?.quote_id;
              return (
                <button
                  key={request.quote_id}
                  type="button"
                  onClick={() => setSelectedId(request.quote_id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/70'
                      : 'border-border bg-card hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{request.service_category}</p>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {formatMarketplaceUrgency(request.urgency)}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{request.job_description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <IconMapPin className="h-3.5 w-3.5" stroke={1.5} />
                      {request.location_city || request.location_zipcode || 'Location not provided'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IconUser className="h-3.5 w-3.5" stroke={1.5} />
                      {request.contact_name || 'Customer'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRequest ? (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    Customer request
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-foreground">
                    {selectedRequest.service_category}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Submitted{' '}
                    {selectedRequest.created_at
                      ? new Date(selectedRequest.created_at).toLocaleString()
                      : 'recently'}
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                  Awaiting response
                </Badge>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedRequest.contact_name || 'Customer'}
                  </p>
                  {selectedRequest.contact_email ? (
                    <p className="mt-1 text-sm text-slate-600">{selectedRequest.contact_email}</p>
                  ) : null}
                  {selectedRequest.contact_phone ? (
                    <p className="mt-1 text-sm text-slate-600">{selectedRequest.contact_phone}</p>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedRequest.location_city || 'City not provided'}
                  </p>
                  {selectedRequest.location_zipcode ? (
                    <p className="mt-1 text-sm text-slate-600">{selectedRequest.location_zipcode}</p>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timing</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <IconClock className="h-4 w-4 text-amber-600" stroke={1.5} />
                    {formatMarketplaceUrgency(selectedRequest.urgency)}
                  </p>
                  {selectedRequest.preferred_date ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                      <IconCalendar className="h-4 w-4" stroke={1.5} />
                      {selectedRequest.preferred_date}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                <p className="text-sm font-semibold text-foreground">Issue details</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {selectedRequest.job_description}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => void handleAccept()}
                  disabled={busyId === selectedRequest.quote_id}
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <IconCheck className="h-4 w-4" stroke={1.8} />
                  Accept and open chat
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleDecline()}
                  disabled={busyId === selectedRequest.quote_id}
                  className="gap-2"
                >
                  <IconX className="h-4 w-4" stroke={1.8} />
                  Decline
                </Button>
                {selectedRequest.contact_phone ? (
                  <Button variant="ghost" className="gap-2" disabled>
                    <IconPhone className="h-4 w-4" stroke={1.8} />
                    {selectedRequest.contact_phone}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
