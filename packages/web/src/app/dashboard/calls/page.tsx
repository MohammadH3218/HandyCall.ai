'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarPlus,
  CheckCircle2,
  Filter,
  Flag,
  Phone,
  Search,
  Tag,
  UserPlus,
  X,
} from 'lucide-react';

interface Call {
  call_id: string;
  company_id: string;
  contact_id?: string;
  caller_phone: string;
  caller_name?: string;
  from_number?: string;
  to_number?: string;
  direction?: string;
  created_at: string;
  duration?: number;
  status: string;
  summary?: string;
  transcript?: string;
  recording_url?: string;
  sentiment?: string;
  lead_captured?: boolean;
  appointment_created?: boolean;
  appointment_id?: string;
  outcome?: string;
  lead_quality?: string;
  collected_info?: Record<string, unknown>;
}

type OutcomeTab = 'ALL' | 'BOOKED' | 'MISSED' | 'VOICEMAIL' | 'SPAM';

const outcomeTabs: Array<{ key: OutcomeTab; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'MISSED', label: 'Missed' },
  { key: 'BOOKED', label: 'Booked' },
  { key: 'VOICEMAIL', label: 'Voicemail' },
  { key: 'SPAM', label: 'Spam' },
];

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getOutcome(call: Call): OutcomeTab {
  const status = String(call.status || '').toUpperCase();
  const outcome = String(call.outcome || '').toUpperCase();

  if (call.appointment_created || call.appointment_id || outcome.includes('BOOK')) return 'BOOKED';
  if (outcome.includes('SPAM') || status.includes('SPAM')) return 'SPAM';
  if (outcome.includes('VOICEMAIL') || status.includes('VOICEMAIL')) return 'VOICEMAIL';
  if (status.includes('MISSED') || status.includes('NO_ANSWER') || outcome.includes('MISSED')) return 'MISSED';

  return 'ALL';
}

function outcomeBadge(call: Call) {
  const outcome = getOutcome(call);
  if (outcome === 'BOOKED') return { label: 'Booked', variant: 'success' as const };
  if (outcome === 'MISSED') return { label: 'Missed', variant: 'warning' as const };
  if (outcome === 'VOICEMAIL') return { label: 'Voicemail', variant: 'secondary' as const };
  if (outcome === 'SPAM') return { label: 'Spam', variant: 'destructive' as const };
  return { label: 'Follow-up', variant: 'info' as const };
}

export default function CallsPage() {
  const router = useRouter();
  const basePath = usePortalBasePath();
  const { toast } = useToast();

  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageKeys, setPageKeys] = useState<(string | null)[]>([null]);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeOutcome, setActiveOutcome] = useState<OutcomeTab>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [numberContains, setNumberContains] = useState('');
  const [tagContains, setTagContains] = useState('');

  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  useEffect(() => {
    void loadCallsPage(1, true);
    void loadTotalCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!calls.length) {
      setSelectedCallId(null);
      setSelectedCall(null);
      return;
    }

    const hasSelected = selectedCallId && calls.some((call) => call.call_id === selectedCallId);
    if (!hasSelected) {
      setSelectedCallId(calls[0].call_id);
    }
  }, [calls, selectedCallId]);

  useEffect(() => {
    if (!selectedCallId) {
      setSelectedCall(null);
      return;
    }

    let cancelled = false;
    const loadDetail = async () => {
      try {
        setSelectedLoading(true);
        const detail = await apiClient.getCallById(selectedCallId);
        if (cancelled) return;
        setSelectedCall(detail || null);
      } catch {
        if (cancelled) return;
        const fallback = calls.find((call) => call.call_id === selectedCallId) || null;
        setSelectedCall(fallback);
      } finally {
        if (!cancelled) {
          setSelectedLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [calls, selectedCallId]);

  const loadTotalCount = async () => {
    try {
      const res = await apiClient.getCallsCount();
      const total = Number(res?.total || 0);
      setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
    } catch {
      setTotalPages(null);
    }
  };

  const loadCallsPage = async (page: number, reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setCalls([]);
        setCurrentPage(1);
        setPageKeys([null]);
      } else {
        setIsPaging(true);
      }

      setError(null);
      const previousKey = pageKeys[page - 1] ?? null;
      const response = await apiClient.getCalls(pageSize, previousKey || undefined);
      const nextCalls = response.calls || [];
      const nextKey = response.lastEvaluatedKey ? JSON.stringify(response.lastEvaluatedKey) : null;

      setCalls(nextCalls);
      setPageKeys((prev) => {
        const next = [...prev];
        next[page] = nextKey;
        return next;
      });
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to load calls');
    } finally {
      setIsLoading(false);
      setIsPaging(false);
    }
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const lookup = `${call.caller_name || ''} ${call.caller_phone || ''} ${call.summary || ''}`.toLowerCase();
      const matchesSearch = !searchQuery.trim() || lookup.includes(searchQuery.trim().toLowerCase());

      const callOutcome = getOutcome(call);
      const matchesOutcome = activeOutcome === 'ALL' || callOutcome === activeOutcome;

      const created = new Date(call.created_at).getTime();
      const minDate = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
      const maxDate = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
      const matchesDate =
        (!minDate || created >= minDate) &&
        (!maxDate || created <= maxDate);

      const matchesNumber =
        !numberContains.trim() ||
        (call.caller_phone || '').toLowerCase().includes(numberContains.trim().toLowerCase());

      const tags = JSON.stringify(call.collected_info || {}).toLowerCase();
      const matchesTag = !tagContains.trim() || tags.includes(tagContains.trim().toLowerCase());

      return matchesSearch && matchesOutcome && matchesDate && matchesNumber && matchesTag;
    });
  }, [calls, searchQuery, activeOutcome, dateFrom, dateTo, numberContains, tagContains]);

  const selectedListCall = filteredCalls.find((call) => call.call_id === selectedCallId) || null;
  const detailCall = selectedCall || selectedListCall;

  const canGoPrev = currentPage > 1;
  const canGoNext = totalPages ? currentPage < totalPages : Boolean(pageKeys[currentPage]);

  const handlePageChange = async (page: number) => {
    if (page === currentPage) return;
    if (!pageKeys[page - 1] && page > 1) return;
    await loadCallsPage(page);
  };

  const handleQuickAction = (action: 'contact' | 'book' | 'spam' | 'assign') => {
    const titleMap = {
      contact: 'Create contact',
      book: 'Book appointment',
      spam: 'Flagged as spam',
      assign: 'Assigned for follow-up',
    };

    toast({
      title: titleMap[action],
      description: 'Action queued. Sync logic can be connected to this control.',
    });
  };

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Calls" subtitle="There was a problem loading call data." />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-3" onClick={() => void loadCallsPage(1, true)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Calls"
        title="Call inbox"
        subtitle="Review outcomes, transcripts, and follow-up actions from one split-view workspace."
        actions={
          <Button variant="secondary" onClick={() => setIsFilterOpen(true)}>
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {outcomeTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-standard ease-standard ${
              activeOutcome === tab.key
                ? 'border-primary/45 bg-primary/12 text-[#cbe8ff]'
                : 'border-border bg-[#0f1115] text-muted-foreground hover:border-[#313538] hover:text-foreground'
            }`}
            onClick={() => setActiveOutcome(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid min-h-[620px] grid-cols-1 divide-y divide-border lg:grid-cols-[360px_1fr] lg:divide-y-0 lg:divide-x">
            <div className="flex min-h-0 flex-col">
              <div className="border-b border-border p-3">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search caller, number, summary"
                  leadingIcon={<Search className="h-4 w-4" />}
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredCalls.length === 0 ? (
                  <div className="p-3">
                    <EmptyState
                      icon={<Phone className="h-6 w-6" />}
                      title="No matching calls"
                      description="Adjust filters or clear search to view more activity."
                    />
                  </div>
                ) : (
                  filteredCalls.map((call) => {
                    const badge = outcomeBadge(call);
                    const selected = call.call_id === selectedCallId;

                    return (
                      <div
                        key={call.call_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCallId(call.call_id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedCallId(call.call_id);
                          }
                        }}
                        className={`group w-full border-b border-border px-3 py-3 text-left transition-colors duration-standard ease-standard ${
                          selected ? 'bg-[#13161b]' : 'hover:bg-[#111419]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {call.caller_name || call.caller_phone || 'Unknown caller'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{call.caller_phone}</p>
                            <p className="mt-2 line-clamp-2 text-xs text-text-faint">
                              {call.summary || 'No summary available yet.'}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            <span className="text-[11px] text-text-faint">{formatDate(call.created_at)}</span>
                            <span className="opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`${basePath}/calls/${call.call_id}`);
                                }}
                              >
                                View
                              </Button>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Page {currentPage}
                    {totalPages ? ` of ${totalPages}` : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={() => void handlePageChange(currentPage - 1)} disabled={!canGoPrev || isPaging}>
                      Prev
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void handlePageChange(currentPage + 1)} disabled={!canGoNext || isPaging}>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              {selectedLoading ? (
                <div className="space-y-3 p-5">
                  <Skeleton className="h-7 w-1/3" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-44 w-full" />
                </div>
              ) : detailCall ? (
                <>
                  <div className="border-b border-border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {detailCall.caller_name || detailCall.caller_phone || 'Call detail'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {detailCall.caller_phone}  -  {formatDate(detailCall.created_at)}  -  {formatDuration(detailCall.duration)}
                        </p>
                      </div>
                      <Badge variant={outcomeBadge(detailCall).variant}>{outcomeBadge(detailCall).label}</Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleQuickAction('contact')}>
                        <UserPlus className="h-4 w-4" />
                        Create contact
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleQuickAction('book')}>
                        <CalendarPlus className="h-4 w-4" />
                        Book
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleQuickAction('spam')}>
                        <Flag className="h-4 w-4" />
                        Tag spam
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleQuickAction('assign')}>
                        <Tag className="h-4 w-4" />
                        Assign
                      </Button>
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 xl:grid-cols-[1fr_1fr]">
                    <div className="rounded-lg border border-border bg-[#0f1115] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Summary</p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {detailCall.summary || 'Summary will appear after call processing.'}
                      </p>

                      {detailCall.collected_info ? (
                        <div className="mt-4 space-y-2 rounded-md border border-border bg-[#13161b] p-3 text-xs text-muted-foreground">
                          <p className="font-semibold uppercase tracking-[0.06em] text-text-faint">Captured fields</p>
                          {Object.entries(detailCall.collected_info).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between gap-3">
                              <span className="text-text-faint">{key.replace(/_/g, ' ')}</span>
                              <span className="text-right text-foreground">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-border bg-[#0f1115] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Transcript</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {detailCall.transcript || 'Transcript not available for this call yet.'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-5">
                  <EmptyState
                    icon={<Phone className="h-6 w-6" />}
                    title="Select a call"
                    description="Choose a call from the left panel to review transcript and actions."
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-40 bg-black/60">
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-[#0f1115] p-5 shadow-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Advanced filters</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Date range</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                  <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Caller number</p>
                <Input value={numberContains} onChange={(event) => setNumberContains(event.target.value)} placeholder="Contains..." />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">Tags / metadata</p>
                <Input value={tagContains} onChange={(event) => setTagContains(event.target.value)} placeholder="ex: urgent" />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setNumberContains('');
                    setTagContains('');
                  }}
                >
                  Reset
                </Button>
                <Button variant="primary" onClick={() => setIsFilterOpen(false)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


