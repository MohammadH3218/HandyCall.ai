'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconMessageCircle,
  IconPhone,
  IconSearch,
  IconUser,
  IconX,
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
  request_type?: string;
  created_at?: number;
  updated_at?: number;
  pro_name?: string;
  pro_photo?: string | null;
  thread_id?: string | null;
  responses?: Array<{ response_id: string; responded_at?: number; company_id?: string; status?: string }>;
};

const PAST_STATUSES = new Set(['CLOSED', 'CANCELLED', 'COMPLETED', 'ACCEPTED', 'DECLINED', 'CLAIMED', 'EXPIRED']);

function isPastRequest(request: CustomerRequest) {
  return PAST_STATUSES.has(String(request.status || '').toUpperCase());
}

function formatDate(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatUrgency(value?: string) {
  switch (value) {
    case 'emergency': return 'Emergency';
    case 'urgent': return 'Within 1-2 days';
    case 'this_week': return 'This week';
    default: return 'Flexible';
  }
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

function StatusBadge({ status }: { status?: string }) {
  const s = String(status || '').toUpperCase();

  if (s === 'ACCEPTED' || s === 'CLAIMED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <IconCheck className="h-3 w-3" stroke={2.5} />
        Accepted
      </span>
    );
  }
  if (s === 'DECLINED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-600">
        <IconX className="h-3 w-3" stroke={2.5} />
        Declined
      </span>
    );
  }
  if (s === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
        <IconCheck className="h-3 w-3" stroke={2.5} />
        Completed
      </span>
    );
  }
  if (s === 'CLOSED' || s === 'CANCELLED' || s === 'EXPIRED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
        <IconX className="h-3 w-3" stroke={2.5} />
        {s === 'EXPIRED' ? 'Expired' : s === 'CANCELLED' ? 'Cancelled' : 'Closed'}
      </span>
    );
  }
  // PENDING / OPEN
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <IconClock className="h-3 w-3" stroke={2} />
      Pending
    </span>
  );
}

export default function CustomerRequestsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<RequestTab>('active');
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
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
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load your requests.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadRequests();
    return () => { mounted = false; };
  }, []);

  const activeRequests = requests.filter((r) => !isPastRequest(r));
  const pastRequests = requests.filter((r) => isPastRequest(r));
  const visibleRequests = tab === 'active' ? activeRequests : pastRequests;

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
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

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {[
            { key: 'active', label: 'Active', count: activeRequests.length },
            { key: 'past', label: 'Past Requests', count: pastRequests.length },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as RequestTab)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                tab === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.label}
              {item.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  tab === item.key ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <IconBriefcase className="mx-auto mb-3 h-10 w-10 text-slate-200" stroke={1.5} />
            <p className="text-sm font-medium text-slate-500">
              {tab === 'active' ? 'No active requests yet.' : 'No past requests yet.'}
            </p>
            {tab === 'active' && (
              <Link
                href="/request"
                className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Start a request
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((request) => (
              <div
                key={request.quote_id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {request.service_category}
                      </span>
                      {tab === 'past' && <StatusBadge status={request.status} />}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{request.job_description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <IconMapPin className="h-3.5 w-3.5" stroke={1.5} />
                        {request.location_city || 'Location pending'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconClock className="h-3.5 w-3.5" stroke={1.5} />
                        {formatDate(request.updated_at || request.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {tab === 'past' && request.thread_id && (
                      <Link
                        href={`/customer/dashboard/inbox?thread_id=${request.thread_id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <IconMessageCircle className="h-3.5 w-3.5" stroke={2} />
                        Open chat
                      </Link>
                    )}
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      View
                      <IconChevronRight className="h-3.5 w-3.5" stroke={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Service Request
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedRequest.service_category}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
              >
                <IconX className="h-5 w-5" stroke={1.8} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <StatusBadge status={selectedRequest.status} />
              <span className="text-xs text-slate-400">{formatUrgency(selectedRequest.urgency)}</span>
            </div>

            {/* Info grid */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your contact</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <IconUser className="h-4 w-4 text-slate-400" stroke={1.6} />
                  {selectedRequest.contact_name || 'You'}
                </p>
                {selectedRequest.contact_email && (
                  <p className="mt-1 text-sm text-slate-600">{selectedRequest.contact_email}</p>
                )}
                {selectedRequest.contact_phone && (
                  <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                    <IconPhone className="h-4 w-4 text-slate-400" stroke={1.6} />
                    {selectedRequest.contact_phone}
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <IconMapPin className="h-4 w-4 text-slate-400" stroke={1.6} />
                  {selectedRequest.location_city || 'Pending'}
                </p>
                <p className="mt-1 text-sm text-slate-600">{formatAddress(selectedRequest) || 'No address added yet'}</p>
              </div>
            </div>

            {selectedRequest.pro_name && (
              <div className="mt-3 rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pro assigned</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedRequest.pro_name}</p>
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{selectedRequest.job_description}</p>
            </div>

            {selectedRequest.preferred_date && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <IconCalendar className="h-4 w-4" stroke={1.5} />
                Preferred date: {new Date(selectedRequest.preferred_date).toLocaleDateString()}
              </div>
            )}

            {selectedRequest.thread_id && (
              <Link
                href={`/customer/dashboard/inbox?thread_id=${selectedRequest.thread_id}`}
                onClick={() => setSelectedRequest(null)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <IconMessageCircle className="h-4 w-4" stroke={2} />
                Open chat
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
