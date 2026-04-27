'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconMessageCircle,
  IconPhone,
  IconSearch,
  IconUser,
} from '@tabler/icons-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

type RequestTab = 'active' | 'past';

type CustomerRequest = {
  quote_id: string;
  service_category: string;
  job_description: string;
  location_address_line1?: string;
  location_address_line2?: string;
  location_city?: string;
  location_state?: string;
  location_zipcode?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  preferred_date?: string;
  urgency?: string;
  status?: string;
  created_at?: number;
  updated_at?: number;
  responses?: Array<{ response_id: string; responded_at?: number; company_id?: string; status?: string }>;
};

function isPastRequest(request: CustomerRequest) {
  const status = String(request.status || '').toUpperCase();
  return ['CLOSED', 'CANCELLED', 'COMPLETED'].includes(status);
}

function formatAddress(request: CustomerRequest) {
  return [
    request.location_address_line1,
    request.location_address_line2,
    [request.location_city, request.location_state, request.location_zipcode].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join(', ');
}

function formatUrgency(value?: string) {
  switch (value) {
    case 'emergency':
      return 'Emergency';
    case 'urgent':
      return 'Within 1-2 days';
    case 'this_week':
      return 'This week';
    default:
      return 'Flexible';
  }
}

export default function CustomerRequestsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<RequestTab>('active');
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice] = useState<string | null>(
    searchParams.get('submitted') === '1' ? 'Request sent successfully.' : null
  );

  useEffect(() => {
    let mounted = true;

    const loadRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiClient.getCustomerQuoteRequests();
        if (!mounted) return;
        const sorted = [...(Array.isArray(result) ? result : [])].sort(
          (a, b) => Number(b.updated_at || b.created_at || 0) - Number(a.updated_at || a.created_at || 0)
        );
        setRequests(sorted);
        setSelectedId(sorted[0]?.quote_id || null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load your requests.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadRequests();
    return () => {
      mounted = false;
    };
  }, []);

  const visibleRequests = useMemo(
    () => requests.filter((request) => (tab === 'active' ? !isPastRequest(request) : isPastRequest(request))),
    [requests, tab]
  );

  const selectedRequest =
    visibleRequests.find((request) => request.quote_id === selectedId) ||
    requests.find((request) => request.quote_id === selectedId) ||
    visibleRequests[0] ||
    null;

  return (
    <div className="p-6 lg:p-8">
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Track your active and past service requests.</p>
        </div>
        <Link
          href="/request"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <IconSearch className="h-4 w-4" stroke={2} />
          New request
        </Link>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {[
          { key: 'active', label: 'Active' },
          { key: 'past', label: 'Past' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as RequestTab)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading requests...</div>
      ) : visibleRequests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <IconMessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-200" stroke={1.5} />
          <p className="text-sm font-medium text-slate-500">No {tab} requests yet.</p>
          <Link
            href="/request"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Start a request
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-3">
            {visibleRequests.map((request) => (
              <button
                key={request.quote_id}
                onClick={() => setSelectedId(request.quote_id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedRequest?.quote_id === request.quote_id
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{request.service_category}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {formatUrgency(request.urgency)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-slate-500">{request.job_description}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <IconMapPin className="h-3.5 w-3.5" stroke={1.5} />
                    {request.location_city || request.location_zipcode || 'Location pending'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IconClock className="h-3.5 w-3.5" stroke={1.5} />
                    {request.updated_at
                      ? new Date(request.updated_at).toLocaleDateString()
                      : 'Recently'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedRequest ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedRequest.service_category}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Submitted {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'recently'}
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <IconUser className="h-4 w-4 text-slate-400" stroke={1.6} />
                    {selectedRequest.contact_name || 'Customer'}
                  </p>
                  {selectedRequest.contact_email ? (
                    <p className="mt-1 text-sm text-slate-600">{selectedRequest.contact_email}</p>
                  ) : null}
                  {selectedRequest.contact_phone ? (
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                      <IconPhone className="h-4 w-4 text-slate-400" stroke={1.6} />
                      {selectedRequest.contact_phone}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <IconMapPin className="h-4 w-4 text-slate-400" stroke={1.6} />
                    {selectedRequest.location_city || 'Address pending'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{formatAddress(selectedRequest) || 'No address added yet'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <IconCalendar className="h-4 w-4 text-slate-400" stroke={1.6} />
                    {isPastRequest(selectedRequest) ? 'Past request' : 'Active request'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedRequest.responses?.length
                      ? `${selectedRequest.responses.length} pro response${selectedRequest.responses.length === 1 ? '' : 's'}`
                      : 'No pro responses yet'}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Job description</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{selectedRequest.job_description}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
    </div>
  );
}
