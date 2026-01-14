'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Search, Users } from 'lucide-react';

type Contact = {
  contact_id: string;
  company_id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  created_at?: string;
  last_contact_at?: string;
};

function formatDate(ts?: number | string) {
  if (!ts) return '—';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(cents?: number) {
  if (typeof cents !== 'number') return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CustomersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactAppointments, setSelectedContactAppointments] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 180);

      const [contactsResp, apptsResp] = await Promise.all([
        apiClient.getContacts(200),
        apiClient.getAppointmentsRange(now.toISOString(), end.toISOString()),
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
        const text = [c.name, c.phone, c.email].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      })
      .map((c) => {
        const upcoming = byPhone.get(c.phone) ?? [];
        const next = upcoming[0];
        const totalSpend = upcoming.reduce((sum, a) => sum + (typeof a?.price_cents === 'number' ? a.price_cents : 0), 0);
        const recurring = upcoming.some((a) => !!a?.series_id);
        return {
          contact: c,
          upcomingCount: upcoming.length,
          nextStart: next?.scheduled_start,
          recurring,
          totalSpend,
        };
      })
      .sort((a, b) => (b.upcomingCount || 0) - (a.upcomingCount || 0));
  }, [contacts, upcomingAppointments, searchQuery]);

  const openDetails = async (contact: Contact) => {
    try {
      setSelectedContact(contact);
      setDetailsOpen(true);
      const resp = await apiClient.getContactAppointments(contact.contact_id);
      setSelectedContactAppointments(resp.appointments || []);
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
    <div className="p-8 animate-fade-in">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-gray-600">Manage customers, upcoming jobs, and recurring service</p>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="mb-6 flex gap-2">
        <Input
          type="text"
          placeholder="Search by name, phone, or email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => void 0}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
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
                  className="border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => void openDetails(row.contact)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900 truncate">{row.contact.name}</div>
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
                      </div>
                      <div className="text-sm text-gray-600 mt-1 truncate">{row.contact.phone}</div>
                      {row.contact.email ? <div className="text-sm text-gray-600 truncate">{row.contact.email}</div> : null}
                      <div className="text-xs text-gray-500 mt-2 flex gap-4 flex-wrap">
                        <span>Next: {row.nextStart ? formatDate(row.nextStart) : '—'}</span>
                        <span>Upcoming value: {row.upcomingCount ? formatMoney(row.totalSpend) : '—'}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers yet</h3>
              <p className="text-sm text-gray-500">Customers are created from calls and appointments.</p>
            </div>
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
                <div className="font-semibold text-gray-900">{selectedContact.name}</div>
                <div className="text-sm text-gray-600">{selectedContact.phone}</div>
                {selectedContact.email ? <div className="text-sm text-gray-600">{selectedContact.email}</div> : null}
                <div className="text-xs text-gray-500 mt-2">
                  Added: {formatDate(selectedContact.created_at)} • Last contact: {formatDate(selectedContact.last_contact_at)}
                </div>
              </div>

              <div>
                <div className="font-semibold text-gray-900 mb-2">Appointments</div>
                {selectedContactAppointments.length ? (
                  <div className="space-y-2">
                    {selectedContactAppointments
                      .filter((a) => !a?.is_series_master)
                      .map((a) => (
                        <div key={a.appointment_id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-gray-900 truncate">{a.service_type || 'Service'}</div>
                            <div className="text-xs text-gray-500">{formatDate(a.scheduled_start)}</div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {a.status || '—'} • {typeof a.price_cents === 'number' ? formatMoney(a.price_cents) : '—'}
                          </div>
                        </div>
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

