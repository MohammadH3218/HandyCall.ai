'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { CalendarCheck, ExternalLink, MessageCircle, PhoneCall, Search, Sparkles, Users } from 'lucide-react';

type Contact = {
  contact_id: string;
  company_id: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  zipcode?: string;
  // Back-compat (older backend responses)
  name?: string;
  phone?: string;
  email?: string;
  source?: string;
  lead_status?: string;
  updated_at?: number | string;
  created_at?: number | string;
  last_contact_at?: number | string;
};

type CustomerMessage = {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  created_at: number;
  status?: string;
  ai_handled?: boolean;
};

function formatDate(ts?: number | string) {
  if (!ts) return '-';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatMoney(cents?: number) {
  if (typeof cents !== 'number') return '-';
  return `$${(cents / 100).toFixed(2)}`;
}

const leadBadge = (status: 'Scheduled' | 'Lead' | 'No Lead') => {
  if (status === 'Scheduled') {
    return { label: 'Scheduled', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (status === 'Lead') {
    return { label: 'Lead', className: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
  return { label: 'No Lead', className: 'bg-gray-50 text-gray-700 border-gray-200' };
};

type LeadStatusLabel = 'Scheduled' | 'Lead' | 'No Lead';

const contactDisplayName = (contact?: Contact | null) => {
  if (!contact) return 'Unknown';
  return (
    String(
      contact.name ||
        `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    ).trim() ||
    String(contact.phone_number || contact.phone || '').trim() ||
    'Unknown'
  );
};

export default function CustomersPage() {
  const router = useRouter();
  const basePath = usePortalBasePath();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactAppointments, setSelectedContactAppointments] = useState<any[]>([]);
  const [selectedContactCalls, setSelectedContactCalls] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const mockBaseTime = useMemo(() => Date.now(), []);

  const buildMockMessages = useCallback((contact: Contact): CustomerMessage[] => {
    const name = contactDisplayName(contact).toLowerCase();
    if (!name.includes('mohammad') || !name.includes('hamdallah')) {
      return [];
    }
    return [
      {
        id: 'mock-1',
        direction: 'INBOUND',
        body: 'Hey, can you come out this week for pest control? Seeing ants in the kitchen.',
        created_at: mockBaseTime - 1000 * 60 * 45,
        status: 'RECEIVED',
      },
      {
        id: 'mock-2',
        direction: 'OUTBOUND',
        body: "Hi Mohammad! We can help. Are you available Tuesday 10-12 or Wednesday 2-4? Also, what's the address?",
        created_at: mockBaseTime - 1000 * 60 * 43,
        status: 'SENT',
        ai_handled: true,
      },
      {
        id: 'mock-3',
        direction: 'INBOUND',
        body: 'Tuesday morning works. 418 W 5th St, Houston.',
        created_at: mockBaseTime - 1000 * 60 * 18,
        status: 'RECEIVED',
      },
      {
        id: 'mock-4',
        direction: 'OUTBOUND',
        body: "Perfect, Tuesday at 10:30am is booked. You'll get a reminder before we arrive.",
        created_at: mockBaseTime - 1000 * 60 * 12,
        status: 'DELIVERED',
        ai_handled: true,
      },
    ];
  }, [mockBaseTime]);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 365);
      const end = new Date(now);
      end.setDate(end.getDate() + 365);

      const [contactsResp, apptsResp] = await Promise.all([
        apiClient.getContacts(200),
        apiClient.getAppointmentsRange(start.toISOString(), end.toISOString()),
      ]);

      setContacts((contactsResp.contacts || []) as Contact[]);
      setUpcomingAppointments(apptsResp.appointments || []);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err?.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const derivedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const appts = (upcomingAppointments || []).filter((a) => !a?.is_series_master);

    const byPhone = new Map<string, any[]>();
    for (const a of appts) {
      const phone = String(a?.contact_phone || '').trim();
      if (!phone) continue;
      const arr = byPhone.get(phone) ?? [];
      arr.push(a);
      byPhone.set(phone, arr);
    }
    for (const [, arr] of byPhone) arr.sort((a, b) => (a?.scheduled_start ?? 0) - (b?.scheduled_start ?? 0));

    return (contacts || [])
      .filter((c) => {
        if (!q) return true;
        const phone = String(c.phone_number || c.phone || '').trim();
        const name = contactDisplayName(c);
        const text = [name, phone, c.email].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      })
      .map((c) => {
        const phone = String(c.phone_number || c.phone || '').trim();
        const upcoming = byPhone.get(phone) ?? [];
        const next = upcoming[0];
        const totalSpend = upcoming.reduce((sum, a) => sum + (typeof a?.price_cents === 'number' ? a.price_cents : 0), 0);
        const recurring = upcoming.some((a) => !!a?.series_id);
        const displayName = contactDisplayName(c);
        const leadStatusRaw = String(c.lead_status || '').toUpperCase();
        const isLead =
          leadStatusRaw === 'NEW' ||
          leadStatusRaw === 'CONTACTED' ||
          leadStatusRaw === 'QUALIFIED' ||
          leadStatusRaw === 'CONVERTED';
        const leadStatus: LeadStatusLabel = upcoming.length > 0 ? 'Scheduled' : isLead ? 'Lead' : 'No Lead';
        const messageCount = buildMockMessages(c).length;
        const lastActivity = Number(c.last_contact_at ?? c.updated_at ?? c.created_at ?? 0);
        return {
          contact: c,
          displayName,
          displayPhone: phone,
          upcomingCount: upcoming.length,
          nextStart: next?.scheduled_start,
          recurring,
          totalSpend,
          leadStatus,
          messageCount,
          lastActivity,
        };
      })
      .sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
  }, [contacts, upcomingAppointments, searchQuery, buildMockMessages]);

  const selectedContactMessages = useMemo(() => {
    if (!selectedContact) return [];
    return buildMockMessages(selectedContact);
  }, [selectedContact, buildMockMessages]);

  const selectedLeadStatus = useMemo<LeadStatusLabel>(() => {
    if (!selectedContact) return 'No Lead' as const;
    const appts = (selectedContactAppointments || []).filter((a) => !a?.is_series_master);
    const hasScheduled = appts.some((a) => String(a?.status || '').toUpperCase() !== 'CANCELLED');
    if (hasScheduled) return 'Scheduled' as const;
    const leadStatusRaw = String(selectedContact.lead_status || '').toUpperCase();
    const hasLeadStatus =
      leadStatusRaw === 'NEW' ||
      leadStatusRaw === 'CONTACTED' ||
      leadStatusRaw === 'QUALIFIED' ||
      leadStatusRaw === 'CONVERTED';
    const hasActivity = selectedContactCalls.length > 0 || selectedContactMessages.length > 0;
    return hasLeadStatus || hasActivity ? ('Lead' as const) : ('No Lead' as const);
  }, [selectedContact, selectedContactAppointments, selectedContactCalls, selectedContactMessages]);

  const openDetails = async (contact: Contact) => {
    try {
      setSelectedContact(contact);
      setDetailsOpen(true);
      const [apptsResp, callsResp] = await Promise.all([
        apiClient.getContactAppointments(contact.contact_id),
        apiClient.getContactCalls(contact.contact_id, 25),
      ]);
      setSelectedContactAppointments(apptsResp.appointments || []);
      setSelectedContactCalls(callsResp.calls || []);
    } catch (err: any) {
      console.error('Error loading customer details:', err);
      setError(err?.message || 'Failed to load customer details');
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={load} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Customers"
        title="Customers and leads"
        subtitle="Track every lead, booking, and conversation in one place."
        actions={
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        }
      />

      <div className="mb-6 flex gap-2 flex-wrap">
        <Input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[220px]"
        />
        <Button onClick={() => void 0}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-700" />
            Customers ({derivedRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse border-b border-gray-200 pb-3">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : derivedRows.length > 0 ? (
            <div className="space-y-3">
              {derivedRows.map((row) => (
                <div
                  key={row.contact.contact_id}
                  className="border border-emerald-100/70 bg-white/85 rounded-xl p-4 hover:-translate-y-[1px] hover:shadow-md transition-all cursor-pointer"
                  onClick={() => void openDetails(row.contact)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900 truncate">{row.displayName}</div>
                        <Badge variant="outline" className={leadBadge(row.leadStatus).className}>
                          {leadBadge(row.leadStatus).label}
                        </Badge>
                        {row.recurring ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Recurring
                          </Badge>
                        ) : null}
                        {row.upcomingCount > 0 ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {row.upcomingCount} upcoming
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            No upcoming
                          </Badge>
                        )}
                        {row.messageCount > 0 ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {row.messageCount} SMS
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-sm text-slate-600 mt-1 truncate">{row.displayPhone}</div>
                      {row.contact.email ? <div className="text-sm text-slate-600 truncate">{row.contact.email}</div> : null}
                      <div className="text-xs text-slate-500 mt-2 flex gap-4 flex-wrap">
                        <span>Next: {row.nextStart ? formatDate(row.nextStart) : '-'}</span>
                        <span>Upcoming value: {row.upcomingCount ? formatMoney(row.totalSpend) : '-'}</span>
                        <span>Last activity: {row.lastActivity ? formatDate(row.lastActivity) : '-'}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No contacts yet"
              description="Contacts appear after a call, SMS, or booking."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer</DialogTitle>
          </DialogHeader>
          {selectedContact ? (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900">{contactDisplayName(selectedContact)}</div>
                <div className="text-sm text-gray-600">
                  {String(selectedContact.phone_number || selectedContact.phone || '').trim()}
                </div>
                {selectedContact.email ? <div className="text-sm text-gray-600">{selectedContact.email}</div> : null}
                {selectedContact.address ? (
                  <div className="text-sm text-gray-600">{selectedContact.address}</div>
                ) : selectedContact.zipcode ? (
                  <div className="text-sm text-gray-600">ZIP {selectedContact.zipcode}</div>
                ) : null}
                <div className="text-xs text-gray-500 mt-2">
                  Added: {formatDate(selectedContact.created_at)} - Last contact: {formatDate(selectedContact.last_contact_at)}
                </div>
                {selectedContact.source ? (
                  <div className="text-xs text-gray-500 mt-1">Source: {selectedContact.source}</div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Lead status</p>
                  <div className="mt-2">
                    <Badge variant="outline" className={leadBadge(selectedLeadStatus).className}>
                      {leadBadge(selectedLeadStatus).label}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Calls</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-900">
                    <PhoneCall className="h-4 w-4 text-emerald-600" />
                    {selectedContactCalls.length} total
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Messages</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-900">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    {selectedContactMessages.length} total
                  </div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  Messages
                </div>
                {selectedContactMessages.length ? (
                  <div className="space-y-3">
                    {selectedContactMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            msg.direction === 'OUTBOUND'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <p>{msg.body}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                            <span>{formatDate(msg.created_at)}</span>
                            {msg.ai_handled ? (
                              <span className="inline-flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> AI
                              </span>
                            ) : null}
                            {msg.status ? <span> - {msg.status}</span> : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No messages found.</div>
                )}
              </div>

              <div>
                <div className="font-semibold text-gray-900 mb-2">Previous calls</div>
                {selectedContactCalls.length ? (
                  <div className="space-y-2">
                    {selectedContactCalls.map((c) => (
                      <button
                        key={c.call_id}
                        type="button"
                        className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:shadow-sm transition-all"
                        onClick={() => router.push(`${basePath}/calls/${c.call_id}`)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-gray-900 truncate">{c.status || 'Call'}</div>
                          <div className="text-xs text-gray-500">{formatDate(c.started_at)}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Duration: {formatDuration(c.duration_seconds)}
                          {c.summary ? ` - ${c.summary}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No calls found.</div>
                )}
              </div>

              <div>
                <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  Appointments
                </div>
                {selectedContactAppointments.length ? (
                  <div className="space-y-2">
                    {selectedContactAppointments
                      .filter((a) => !a?.is_series_master)
                      .map((a) => (
                        <button
                          key={a.appointment_id}
                          type="button"
                          className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-emerald-500 hover:shadow-sm transition-all"
                          onClick={() => {
                            setDetailsOpen(false);
                            router.push(`${basePath}/appointments?appointmentId=${a.appointment_id}`);
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-gray-900 truncate">{a.service_type || 'Service'}</div>
                            <div className="text-xs text-gray-500">{formatDate(a.scheduled_start)}</div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {a.status || '-'} - {typeof a.price_cents === 'number' ? formatMoney(a.price_cents) : '-'}
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No appointments found.</div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
