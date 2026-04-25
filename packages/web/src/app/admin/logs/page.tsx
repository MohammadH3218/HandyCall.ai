'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@handycall/shared';
import { PageHeader } from '@/components/portal/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';

type Facets = {
  categories: string[];
  severities: string[];
  outcomes: string[];
  actor_types: string[];
};

type AuditLogEvent = {
  event_id: string;
  company_id?: string;
  occurred_at: number;
  category: string;
  severity: string;
  outcome: string;
  action: string;
  route?: string;
  method?: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  actor_type?: string;
  actor_id?: string;
  actor_email?: string;
  actor_role?: string;
  actor_user_type?: string;
  target_type?: string;
  target_id?: string;
};

type AuditLogResponse = {
  items: AuditLogEvent[];
  next_cursor: string | null;
};

const DEFAULT_FILTERS = {
  search: '',
  company_id: '',
  actor_email: '',
  category: 'all',
  severity: 'all',
  outcome: 'all',
  actor_type: 'all',
  request_id: '',
  target_type: '',
  start_date: '',
  end_date: '',
};

export default function AdminLogsPage() {
  const router = useRouter();
  const { userRole, isAuthenticated, isLoading } = useAuthStore();
  const [facets, setFacets] = useState<Facets>({
    categories: [],
    severities: [],
    outcomes: [],
    actor_types: [],
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [logs, setLogs] = useState<AuditLogEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== UserRole.ADMIN)) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated && userRole === UserRole.ADMIN) {
      void loadFacets();
      void loadLogs();
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
  }

  async function loadFacets() {
    try {
      const data = await fetchJson<Facets>('/api/proxy/admin/logs/facets');
      setFacets(data);
    } catch (nextError: any) {
      setError(nextError?.message || 'Failed to load log filter options.');
    }
  }

  function buildQuery(nextCursor?: string | null) {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.company_id.trim()) params.set('company_id', filters.company_id.trim());
    if (filters.actor_email.trim()) params.set('actor_email', filters.actor_email.trim());
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.severity !== 'all') params.set('severity', filters.severity);
    if (filters.outcome !== 'all') params.set('outcome', filters.outcome);
    if (filters.actor_type !== 'all') params.set('actor_type', filters.actor_type);
    if (filters.request_id.trim()) params.set('request_id', filters.request_id.trim());
    if (filters.target_type.trim()) params.set('target_type', filters.target_type.trim());
    if (filters.start_date) {
      params.set('start_date', String(new Date(`${filters.start_date}T00:00:00`).getTime()));
    }
    if (filters.end_date) {
      params.set('end_date', String(new Date(`${filters.end_date}T23:59:59.999`).getTime()));
    }
    params.set('limit', '50');
    if (nextCursor) params.set('cursor', nextCursor);
    return params.toString();
  }

  async function loadLogs(nextCursor?: string | null) {
    const isLoadMore = Boolean(nextCursor);
    setError(null);
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const query = buildQuery(nextCursor);
      const data = await fetchJson<AuditLogResponse>(`/api/proxy/admin/logs?${query}`);
      setLogs((current) => (isLoadMore ? [...current, ...data.items] : data.items));
      setCursor(data.next_cursor);
      setSelectedEvent((current) => current || data.items[0] || null);
    } catch (nextError: any) {
      setError(nextError?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const summary = useMemo(() => {
    if (logs.length === 0) {
      return 'No events match the current filters.';
    }
    return `${logs.length}${cursor ? '+' : ''} events loaded`;
  }, [logs.length, cursor]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Admin"
        title="Audit logs"
        subtitle="Search account activity, security events, admin actions, payments, and profile changes."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>{summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              placeholder="Search email, request ID, target ID, or event ID"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <Input
              placeholder="Company ID or platform"
              value={filters.company_id}
              onChange={(event) => setFilters((current) => ({ ...current, company_id: event.target.value }))}
            />
            <Input
              placeholder="Actor email"
              value={filters.actor_email}
              onChange={(event) => setFilters((current) => ({ ...current, actor_email: event.target.value }))}
            />
            <Input
              placeholder="Request ID"
              value={filters.request_id}
              onChange={(event) => setFilters((current) => ({ ...current, request_id: event.target.value }))}
            />
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters((current) => ({ ...current, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {facets.categories.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.severity}
              onValueChange={(value) => setFilters((current) => ({ ...current, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {facets.severities.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.outcome}
              onValueChange={(value) => setFilters((current) => ({ ...current, outcome: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                {facets.outcomes.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.actor_type}
              onValueChange={(value) => setFilters((current) => ({ ...current, actor_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Actor type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actor types</SelectItem>
                {facets.actor_types.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Target type"
              value={filters.target_type}
              onChange={(event) => setFilters((current) => ({ ...current, target_type: event.target.value }))}
            />
            <Input
              type="date"
              value={filters.start_date}
              onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))}
            />
            <Input
              type="date"
              value={filters.end_date}
              onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void loadLogs()}>Apply filters</Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setSelectedEvent(null);
                setCursor(null);
                setTimeout(() => void loadLogs(), 0);
              }}
            >
              Reset
            </Button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Newest events first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events found for these filters.</p>
            ) : (
              logs.map((event) => (
                <button
                  key={event.event_id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedEvent?.event_id === event.event_id
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{event.category}</Badge>
                    <Badge variant="outline">{event.severity}</Badge>
                    <Badge variant="outline">{event.outcome}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleString('en-SA')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{event.action}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {event.actor_email || event.actor_id || event.actor_type || 'Anonymous'} •{' '}
                    {event.target_type || 'event'} {event.target_id ? `• ${event.target_id}` : ''}
                  </p>
                </button>
              ))
            )}
            {cursor ? (
              <Button
                variant="outline"
                onClick={() => void loadLogs(cursor)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading more...' : 'Load more'}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event details</CardTitle>
            <CardDescription>Inspect metadata without exposing sensitive payload contents.</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedEvent ? (
              <p className="text-sm text-muted-foreground">Select an event to inspect its metadata.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Event ID:</span> {selectedEvent.event_id}</p>
                  <p><span className="font-medium">Action:</span> {selectedEvent.action}</p>
                  <p><span className="font-medium">Actor:</span> {selectedEvent.actor_email || selectedEvent.actor_id || selectedEvent.actor_type || 'Anonymous'}</p>
                  <p><span className="font-medium">Role:</span> {selectedEvent.actor_role || selectedEvent.actor_user_type || 'n/a'}</p>
                  <p><span className="font-medium">Target:</span> {selectedEvent.target_type || 'n/a'} {selectedEvent.target_id || ''}</p>
                  <p><span className="font-medium">Route:</span> {selectedEvent.method || 'n/a'} {selectedEvent.route || ''}</p>
                  <p><span className="font-medium">Request ID:</span> {selectedEvent.request_id || 'n/a'}</p>
                  <p><span className="font-medium">IP:</span> {selectedEvent.ip_address || 'n/a'}</p>
                  <p><span className="font-medium">Company scope:</span> {selectedEvent.company_id || 'platform'}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-900">Metadata</p>
                  <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
