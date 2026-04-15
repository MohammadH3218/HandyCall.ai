'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconEdit,
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

type EditDraft = {
  job_description: string;
  location_address_line1: string;
  location_address_line2: string;
  location_city: string;
  location_state: string;
  location_zipcode: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  urgency: string;
};

const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

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

function buildDraft(request: CustomerRequest): EditDraft {
  return {
    job_description: request.job_description || '',
    location_address_line1: request.location_address_line1 || '',
    location_address_line2: request.location_address_line2 || '',
    location_city: request.location_city || '',
    location_state: request.location_state || 'TX',
    location_zipcode: request.location_zipcode || '',
    contact_name: request.contact_name || '',
    contact_email: request.contact_email || '',
    contact_phone: request.contact_phone || '',
    urgency: request.urgency || 'flexible',
  };
}

export default function CustomerRequestsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<RequestTab>('active');
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get('submitted') === '1' ? 'Request sent. You can edit it here any time.' : null
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);

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

  useEffect(() => {
    if (!selectedRequest) {
      setDraft(null);
      return;
    }
    setDraft(buildDraft(selectedRequest));
  }, [selectedRequest]);

  const handleEditToggle = () => {
    if (!selectedRequest) return;
    setEditing((current) => {
      const next = !current;
      if (!next) {
        setDraft(buildDraft(selectedRequest));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRequest || !draft) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await apiClient.updateCustomerQuoteRequest(selectedRequest.quote_id, draft);
      setRequests((current) =>
        current
          .map((request) => (request.quote_id === selectedRequest.quote_id ? { ...request, ...updated } : request))
          .sort((a, b) => Number(b.updated_at || b.created_at || 0) - Number(a.updated_at || a.created_at || 0))
      );
      setEditing(false);
      setNotice('Request updated. Pros will now see the latest details.');
    } catch (err: any) {
      setError(err?.message || 'Could not save your updates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Active requests stay at the top, and you can update the details any time.</p>
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
                onClick={() => {
                  setSelectedId(request.quote_id);
                  setEditing(false);
                }}
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

          {selectedRequest && draft ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedRequest.service_category}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Submitted {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'recently'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleEditToggle}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    <IconEdit className="h-4 w-4" stroke={1.8} />
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                  {editing ? (
                    <button
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <IconCheck className="h-4 w-4" stroke={1.8} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  ) : null}
                </div>
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

              {editing ? (
                <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Job description</label>
                    <textarea
                      rows={5}
                      className={`${INPUT_CLS} resize-none`}
                      value={draft.job_description}
                      onChange={(e) => setDraft((current) => current ? { ...current, job_description: e.target.value } : current)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                      <input
                        className={INPUT_CLS}
                        value={draft.location_address_line1}
                        onChange={(e) => setDraft((current) => current ? { ...current, location_address_line1: e.target.value } : current)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Unit</label>
                      <input
                        className={INPUT_CLS}
                        value={draft.location_address_line2}
                        onChange={(e) => setDraft((current) => current ? { ...current, location_address_line2: e.target.value } : current)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                      <input
                        className={INPUT_CLS}
                        value={draft.location_city}
                        onChange={(e) => setDraft((current) => current ? { ...current, location_city: e.target.value } : current)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">State</label>
                        <input
                          className={INPUT_CLS}
                          value={draft.location_state}
                          onChange={(e) => setDraft((current) => current ? { ...current, location_state: e.target.value.toUpperCase().slice(0, 2) } : current)}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">ZIP</label>
                        <input
                          className={INPUT_CLS}
                          value={draft.location_zipcode}
                          onChange={(e) => setDraft((current) => current ? { ...current, location_zipcode: e.target.value.replace(/\D/g, '').slice(0, 5) } : current)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
                      <input
                        className={INPUT_CLS}
                        value={draft.contact_name}
                        onChange={(e) => setDraft((current) => current ? { ...current, contact_name: e.target.value } : current)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                      <input
                        className={INPUT_CLS}
                        value={draft.contact_email}
                        onChange={(e) => setDraft((current) => current ? { ...current, contact_email: e.target.value } : current)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                      <input
                        className={INPUT_CLS}
                        value={draft.contact_phone}
                        onChange={(e) => setDraft((current) => current ? { ...current, contact_phone: e.target.value } : current)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Urgency</label>
                      <select
                        className={INPUT_CLS}
                        value={draft.urgency}
                        onChange={(e) => setDraft((current) => current ? { ...current, urgency: e.target.value } : current)}
                      >
                        <option value="emergency">Emergency</option>
                        <option value="urgent">Within 1-2 days</option>
                        <option value="this_week">This week</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-900">Request details</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{selectedRequest.job_description}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
