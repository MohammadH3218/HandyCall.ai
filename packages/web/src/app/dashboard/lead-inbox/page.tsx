'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconMessageCircle,
  IconPhone,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react';

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

const stageBadgeClass = (stage?: LeadItem['lead_progress_stage']) => {
  switch (stage) {
    case 'READY_TO_BOOK':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'INTAKE_STARTED':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300';
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
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
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
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              {leads.length} total lead{leads.length === 1 ? '' : 's'}
            </Badge>
            <Button onClick={() => void load()} size="sm" variant="outline">
              Refresh leads
            </Button>
          </div>
        }
      />

      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {search && (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
          >
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </Badge>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconUsers className="h-6 w-6 text-muted-foreground" />}
          title="No leads found"
          description="Leads will appear here after callers show real service interest."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const name = lead.contact_name || lead.phone_number || 'Unknown';
            const createdAt = lead.created_at ? new Date(lead.created_at).toLocaleString() : '';
            return (
              <div
                key={lead.call_id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-slate-200 dark:hover:border-slate-700"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950 text-sm font-bold text-amber-700 dark:text-amber-300">
                    {(name[0] || '?').toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={lead.contact_id ? `/dashboard/customers?contact=${lead.contact_id}` : `/dashboard/calls/${lead.call_id}`}
                        className="text-sm font-semibold text-foreground transition hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {name}
                      </Link>
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      >
                        Lead
                      </Badge>
                      <Badge
                        variant="outline"
                        className={stageBadgeClass(lead.lead_progress_stage)}
                      >
                        {progressLabel(lead.lead_progress_stage)}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{lead.phone_number}</p>
                      {createdAt ? <p>{createdAt}</p> : null}
                      {lead.duration_seconds ? <p>{lead.duration_seconds}s call</p> : null}
                    </div>

                    {lead.summary ? (
                      <p className="text-sm text-foreground">{lead.summary}</p>
                    ) : null}
                    {lead.lead_reason ? (
                      <p className="text-sm text-muted-foreground">{lead.lead_reason}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {lead.phone_number ? (
                      <Link
                        href="/dashboard/outbound-calls"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-emerald-200 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                      >
                        <IconPhone stroke={1.5} className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    {lead.phone_number ? (
                      <Link
                        href="/dashboard/messages"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-emerald-200 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                      >
                        <IconMessageCircle stroke={1.5} className="h-3.5 w-3.5" />
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
