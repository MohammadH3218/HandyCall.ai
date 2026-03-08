'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, Search, Users } from 'lucide-react';

type LeadItem = {
  call_id: string;
  contact_id?: string;
  phone_number: string;
  contact_name?: string;
  summary?: string;
  lead_reason?: string;
  lead_progress_stage?: 'INTERESTED' | 'INTAKE_STARTED' | 'READY_TO_BOOK';
  created_at?: number;
  duration_seconds?: number;
};

const progressLabel = (stage?: LeadItem['lead_progress_stage']) => {
  switch (stage) {
    case 'READY_TO_BOOK':
      return 'Ready to book';
    case 'INTAKE_STARTED':
      return 'Intake started';
    default:
      return 'Interested';
  }
};

export default function LeadInboxPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const leadData = await apiClient.getLeads().catch(() => []);
      setLeads(Array.isArray(leadData) ? leadData : []);
    } catch {
      setLeads([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (!search) return true;
      const haystack = `${lead.contact_name || ''} ${lead.phone_number || ''} ${lead.summary || ''} ${lead.lead_reason || ''}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [leads, search]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Lead Inbox"
        subtitle="People who showed real buying intent on the call and should be followed up."
        actions={
          <Button onClick={() => void load()} size="sm" variant="outline">
            Refresh leads
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
          {filtered.length} lead{filtered.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-slate-400" />}
          title="No leads found"
          description="Leads will appear here after callers show real service interest."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const name = lead.contact_name || lead.phone_number || 'Unknown';
            const createdAt = lead.created_at ? new Date(lead.created_at).toLocaleString() : '';
            return (
              <div key={lead.call_id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">
                    {(name[0] || '?').toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={lead.contact_id ? `/dashboard/customers?contact=${lead.contact_id}` : `/dashboard/calls/${lead.call_id}`}
                        className="text-sm font-semibold text-slate-900 transition hover:text-emerald-600"
                      >
                        {name}
                      </Link>
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                        Lead
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {progressLabel(lead.lead_progress_stage)}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <p>{lead.phone_number}</p>
                      {createdAt ? <p>{createdAt}</p> : null}
                      {lead.duration_seconds ? <p>{lead.duration_seconds}s call</p> : null}
                    </div>

                    {lead.summary ? <p className="text-sm text-slate-700">{lead.summary}</p> : null}
                    {lead.lead_reason ? <p className="text-sm text-slate-500">{lead.lead_reason}</p> : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {lead.phone_number ? (
                      <Link
                        href="/dashboard/outbound-calls"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:text-emerald-600"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    {lead.phone_number ? (
                      <Link
                        href="/dashboard/messages"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:text-emerald-600"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
