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
  IconExternalLink,
  IconMapPin,
  IconMessageCircle,
  IconPhone,
  IconSearch,
  IconUser,
  IconX,
} from '@tabler/icons-react';

type RequestTab = 'active' | 'past';

type QuoteRequest = {
  quote_id: string;
  service_category: string;
  job_description: string;
  location_zipcode?: string;
  location_city?: string;
  location_address_line1?: string;
  location_address_line2?: string;
  location_state?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  customer_user_id?: string;
  preferred_date?: string;
  urgency?: string;
  created_at?: number;
  updated_at?: number;
  responses?: Array<{ company_id?: string; status?: string; responded_at?: number }>;
};

export default function MarketplaceRequestsPage() {
  const router = useRouter();
  const companyId = useAuthStore((state) => state.company?.company_id);
  const [activeRequests, setActiveRequests] = useState<QuoteRequest[]>([]);
  const [pastRequests, setPastRequests] = useState<QuoteRequest[]>([]);
  const [tab, setTab] = useState<RequestTab>('active');
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
        const [active, past] = await Promise.all([
          apiClient.getAvailableQuotes(),
          apiClient.getPastQuoteRequests(),
        ]);

        if (!mounted) return;
        const nextActive = Array.isArray(active) ? active : [];
        const nextPast = Array.isArray(past) ? past : [];
        setActiveRequests(nextActive);
        setPastRequests(nextPast);
        setSelectedId((nextActive[0] || nextPast[0])?.quote_id || null);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setActiveRequests([]);
        setPastRequests([]);
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

  const currentRequests = tab === 'active' ? activeRequests : pastRequests;

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return currentRequests;
    return currentRequests.filter((request) =>
      `${request.service_category} ${request.job_description} ${request.location_city || ''} ${
        request.contact_name || ''
      } ${request.contact_email || ''} ${request.contact_phone || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [currentRequests, search]);

  const selectedRequest =
    filteredRequests.find((request) => request.quote_id === selectedId) || filteredRequests[0] || null;

  useEffect(() => {
    if (!selectedRequest) {
      setSelectedId(null);
      return;
    }
    if (selectedRequest.quote_id !== selectedId) {
      setSelectedId(selectedRequest.quote_id);
    }
  }, [selectedId, selectedRequest]);

  function removeActiveRequest(quoteId: string) {
    setActiveRequests((current) => current.filter((request) => request.quote_id !== quoteId));
  }

  const handleDecline = async () => {
    if (!selectedRequest) return;
    setBusyId(selectedRequest.quote_id);

    try {
      await apiClient.respondToQuoteRequest(selectedRequest.quote_id, {
        status: 'DECLINED',
        message: 'Declined by provider',
      });

      removeActiveRequest(selectedRequest.quote_id);
      setPastRequests((current) => [
        {
          ...selectedRequest,
          updated_at: Date.now(),
          responses: [
            ...(selectedRequest.responses || []),
            { company_id: companyId || undefined, status: 'DECLINED', responded_at: Date.now() },
          ],
        },
        ...current,
      ]);
      setTab('past');
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
      const threadId = buildMarketplaceThreadId(
        companyId,
        selectedRequest.quote_id,
        selectedRequest.contact_email,
      );
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

      const response = await apiClient.respondToQuoteRequest(selectedRequest.quote_id, {
        status: 'ACCEPTED',
        message: 'Accepted by provider',
      });

      const nextQuoteContext = {
        ...quoteContext,
        contact_id: response?.contact?.contact_id || response?.contact_id,
      };

      await apiClient.sendProMessage(threadId, {
        message: '',
        customer_email: selectedRequest.contact_email,
        customer_name: selectedRequest.contact_name,
        customer_phone: selectedRequest.contact_phone,
        customer_user_id: selectedRequest.customer_user_id,
        request_status: 'ACCEPTED',
        quote_context: nextQuoteContext,
        message_type: 'SYSTEM',
        system_event: 'REQUEST_ACCEPTED',
      });

      removeActiveRequest(selectedRequest.quote_id);
      setPastRequests((current) => [
        {
          ...selectedRequest,
          updated_at: Date.now(),
          responses: [
            ...(selectedRequest.responses || []),
            { company_id: companyId, status: 'ACCEPTED', responded_at: Date.now() },
          ],
        },
        ...current,
      ]);
      router.push(`/dashboard/marketplace/inbox/${threadId}`);
    } catch (err: any) {
      setError(err?.message || 'Could not accept the request.');
    } finally {
      setBusyId(null);
    }
  };

  const requestStatus =
    selectedRequest?.responses?.find((response) => response.company_id === companyId)?.status || 'UPDATED';
  const selectedLocationLine = selectedRequest
    ? [
        selectedRequest.location_address_line1,
        selectedRequest.location_address_line2,
        selectedRequest.location_city,
        selectedRequest.location_state,
        selectedRequest.location_zipcode,
      ]
        .filter(Boolean)
        .join(', ')
    : '';
  const selectedMapQuery = selectedLocationLine ? encodeURIComponent(selectedLocationLine) : '';
  const selectedMapEmbedUrl = selectedMapQuery
    ? `https://maps.google.com/maps?output=embed&q=${selectedMapQuery}`
    : '';
  const selectedMapLink = selectedMapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${selectedMapQuery}`
    : '';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Requests"
        subtitle="Review incoming customer job requests, then accept to start a direct conversation or decline to pass."
        actions={
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {activeRequests.length} open request{activeRequests.length === 1 ? '' : 's'}
          </Badge>
        }
      />

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {[
          { key: 'active', label: 'Active', count: activeRequests.length },
          { key: 'past', label: 'Past', count: pastRequests.length },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as RequestTab)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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
          title={tab === 'active' ? 'No marketplace requests' : 'No past requests yet'}
          description={
            tab === 'active'
              ? 'New customer job requests will appear here as people contact pros through the marketplace.'
              : 'Requests you accept or decline will move here so you can review them later.'
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const active = request.quote_id === selectedRequest?.quote_id;
              const responseStatus =
                request.responses?.find((response) => response.company_id === companyId)?.status || null;

              return (
                <button
                  key={request.quote_id}
                  type="button"
                  onClick={() => setSelectedId(request.quote_id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active ? 'border-emerald-500 bg-emerald-50/70' : 'border-border bg-card hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{request.service_category}</p>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {tab === 'active' ? formatMarketplaceUrgency(request.urgency) : responseStatus || 'Updated'}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Customer request</p>
                  <h2 className="mt-2 text-2xl font-bold text-foreground">{selectedRequest.service_category}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Submitted {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'recently'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    tab === 'active'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }
                >
                  {tab === 'active' ? 'Awaiting response' : requestStatus}
                </Badge>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedRequest.contact_name || 'Customer'}</p>
                  {selectedRequest.contact_email ? <p className="mt-1 text-sm text-slate-600">{selectedRequest.contact_email}</p> : null}
                  {selectedRequest.contact_phone ? <p className="mt-1 text-sm text-slate-600">{selectedRequest.contact_phone}</p> : null}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedRequest.location_city || 'City not provided'}</p>
                  {selectedRequest.location_address_line1 ? <p className="mt-1 text-sm text-slate-600">{selectedRequest.location_address_line1}</p> : null}
                  {selectedRequest.location_address_line2 ? <p className="mt-1 text-sm text-slate-600">{selectedRequest.location_address_line2}</p> : null}
                  {selectedRequest.location_state || selectedRequest.location_zipcode ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {[selectedRequest.location_state, selectedRequest.location_zipcode].filter(Boolean).join(' ')}
                    </p>
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

              {selectedMapEmbedUrl ? (
                <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Location map</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Preview the job site and open it directly in Google Maps.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open(selectedMapLink, '_blank')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-600"
                    >
                      Open in Maps
                      <IconExternalLink className="h-3.5 w-3.5" stroke={1.8} />
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <iframe
                      title="Customer request location"
                      src={selectedMapEmbedUrl}
                      className="h-56 w-full"
                      loading="lazy"
                    />
                  </div>

                  <p className="mt-3 text-sm text-slate-600">{selectedLocationLine}</p>
                </div>
              ) : null}

              {tab === 'active' ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleAccept()}
                    disabled={busyId === selectedRequest.quote_id}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <IconCheck className="h-4 w-4" stroke={1.8} />
                    Accept and open chat
                  </Button>
                  <Button variant="outline" onClick={() => void handleDecline()} disabled={busyId === selectedRequest.quote_id} className="gap-2">
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
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
