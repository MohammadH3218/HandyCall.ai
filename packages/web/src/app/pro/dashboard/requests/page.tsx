'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBriefcase,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconMessageCircle,
  IconX,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

type RequestTab = 'new' | 'past';

type QuoteRequest = {
  quote_id: string;
  service_category: string;
  job_description: string;
  district: string;
  status: string;
  created_at: number;
  thread_id?: string | null;
  // Only present on accepted/past
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
};

function formatDate(ts?: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACCEPTED') {
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
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <IconClock className="h-3 w-3" stroke={2} />
      Pending
    </span>
  );
}

export default function ProRequestsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<RequestTab>('new');
  const [newRequests, setNewRequests] = useState<QuoteRequest[]>([]);
  const [pastRequests, setPastRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [responding, setResponding] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [available, past] = await Promise.all([
        apiClient.getAvailableQuotes(),
        apiClient.getPastQuoteRequests(),
      ]);
      setNewRequests(Array.isArray(available) ? available : []);
      setPastRequests(Array.isArray(past) ? past : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const handleRespond = async (action: 'ACCEPT' | 'DECLINE') => {
    if (!selectedQuote) return;
    setResponding(true);
    setRespondError(null);
    try {
      const result = await apiClient.respondToQuoteRequest(selectedQuote.quote_id, { action });
      if (action === 'ACCEPT' && result?.thread?.thread_id) {
        router.push(`/pro/dashboard/messages?thread_id=${result.thread.thread_id}`);
        return;
      }
      setSelectedQuote(null);
      await loadRequests();
    } catch (err: any) {
      setRespondError(err?.message || 'Could not process your response. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const visibleRequests = tab === 'new' ? newRequests : pastRequests;

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review incoming requests. Accept to reveal contact details and open a chat.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {[
            { key: 'new', label: 'New Requests', count: newRequests.length },
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
              {tab === 'new' ? 'No new requests yet.' : 'No past requests yet.'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {tab === 'new'
                ? 'When customers request your services, they appear here.'
                : 'Accepted and declined requests will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((req) => (
              <div
                key={req.quote_id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {req.service_category}
                      </span>
                      {tab === 'past' && statusBadge(req.status)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <IconMapPin className="h-3.5 w-3.5" stroke={1.5} />
                        {req.district || 'Riyadh'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconClock className="h-3.5 w-3.5" stroke={1.5} />
                        {formatDate(req.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {tab === 'past' && req.thread_id && (
                      <button
                        onClick={() => router.push(`/pro/dashboard/messages?thread_id=${req.thread_id}`)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <IconMessageCircle className="h-3.5 w-3.5" stroke={2} />
                        Open chat
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedQuote(req);
                        setRespondError(null);
                      }}
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

      {/* ── Request detail modal ─────────────────────────────────────────────── */}
      {selectedQuote && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedQuote(null)}
        >
          <div
            className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Job Request
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedQuote.service_category}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedQuote.district} · {formatDate(selectedQuote.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
              >
                <IconX className="h-5 w-5" stroke={1.8} />
              </button>
            </div>

            {/* Redacted notice for pending requests */}
            {selectedQuote.status === 'PENDING' && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Contact details and exact address are hidden until you accept this request. Accepting counts as a paid lead.
              </div>
            )}

            {/* Contact + address (only if accepted) */}
            {selectedQuote.status !== 'PENDING' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedQuote.contact_name || '—'}</p>
                  {selectedQuote.contact_email && (
                    <p className="mt-1 text-sm text-slate-600">{selectedQuote.contact_email}</p>
                  )}
                  {selectedQuote.contact_phone && (
                    <p className="mt-1 text-sm text-slate-600">{selectedQuote.contact_phone}</p>
                  )}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedQuote.district}</p>
                  {selectedQuote.address_line1 && (
                    <p className="mt-1 text-sm text-slate-600">{selectedQuote.address_line1}</p>
                  )}
                  {selectedQuote.address_line2 && (
                    <p className="mt-1 text-sm text-slate-600">{selectedQuote.address_line2}</p>
                  )}
                </div>
              </div>
            )}

            {respondError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {respondError}
              </div>
            )}

            {/* Actions — only for pending */}
            {selectedQuote.status === 'PENDING' && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => void handleRespond('DECLINE')}
                  disabled={responding}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {responding ? '...' : 'Decline'}
                </button>
                <button
                  onClick={() => void handleRespond('ACCEPT')}
                  disabled={responding}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {responding ? 'Accepting...' : 'Accept & Open Chat'}
                </button>
              </div>
            )}

            {/* For past accepted, show link to chat */}
            {selectedQuote.status === 'ACCEPTED' && selectedQuote.thread_id && (
              <button
                onClick={() => {
                  setSelectedQuote(null);
                  router.push(`/pro/dashboard/messages?thread_id=${selectedQuote.thread_id}`);
                }}
                className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Open Chat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
