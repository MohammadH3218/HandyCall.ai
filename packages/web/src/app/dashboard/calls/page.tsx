'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/portal/page-header';
import { EmptyState } from '@/components/portal/empty-state';
import { Phone, Search, ChevronRight, Clock, PhoneCall } from 'lucide-react';

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
  collected_info?: any;
}

export default function CallsPage() {
  const router = useRouter();
  const basePath = usePortalBasePath();
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactFilter, setContactFilter] = useState<string | null>(null);
  const [pageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageKeys, setPageKeys] = useState<(string | null)[]>([null]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isPaging, setIsPaging] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const contact = params.get('contact');
    setContactFilter(contact);
  }, []);

  useEffect(() => {
    void loadCallsPage(1, true);
    void loadTotalCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactFilter]);

  const loadTotalCount = async () => {
    if (contactFilter) {
      // Count is returned by contact call endpoint when needed.
      return;
    }
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
        setTotalPages(null);
      } else {
        setIsPaging(true);
      }
      setError(null);

      const previousKey = pageKeys[page - 1] ?? null;
      const response = contactFilter
        ? await apiClient.getContactCalls(contactFilter, pageSize, previousKey || undefined)
        : await apiClient.getCalls(pageSize, previousKey || undefined);

      setCalls(response.calls || []);
      const nextKey = response.lastEvaluatedKey ? JSON.stringify(response.lastEvaluatedKey) : null;
      setPageKeys((prev) => {
        const next = [...prev];
        next[page] = nextKey;
        return next;
      });

      if (contactFilter && typeof response.total === 'number') {
        setTotalPages(Math.max(1, Math.ceil(response.total / pageSize)));
      }

      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error loading calls:', err);
      setError(err.message || 'Failed to load calls');
    } finally {
      setIsLoading(false);
      setIsPaging(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      void loadCallsPage(1, true);
      return;
    }

    try {
      setIsLoading(true);
      const results = await apiClient.searchCalls(searchQuery, pageSize);
      setCalls(results || []);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error searching calls:', err);
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCall = (callId: string) => {
    router.push(`${basePath}/calls/${callId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOutcome = (call: Call): { label: string; className: string } => {
    const outcome = (call.outcome || '').toUpperCase();
    if (outcome === 'APPOINTMENT_BOOKED' || call.appointment_created || call.appointment_id) {
      return { label: 'Booked', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (outcome === 'LEAD' || call.lead_captured) {
      return { label: 'Lead', className: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: 'No Lead', className: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const getStatusBadge = (status?: string): { label: string; className: string } => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') return { label: 'Completed', className: 'bg-gray-50 text-gray-700 border-gray-200' };
    if (s === 'IN_PROGRESS' || s === 'RINGING')
      return { label: s.replace('_', ' '), className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (s === 'FAILED' || s === 'NO_ANSWER' || s === 'BUSY')
      return { label: s.replace('_', ' '), className: 'bg-red-50 text-red-700 border-red-200' };
    return { label: (status || 'Unknown').replace('_', ' '), className: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      case 'neutral':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const paginationOptions = useMemo(() => {
    const pages = totalPages ? Array.from({ length: totalPages }, (_, idx) => idx + 1) : [1];
    return pages;
  }, [totalPages]);

  const canGoPrev = currentPage > 1;
  const canGoNext = totalPages ? currentPage < totalPages : Boolean(pageKeys[currentPage]);

  const handlePageChange = async (page: number) => {
    if (page === currentPage) return;
    // Ensure we have the cursor for the requested page (cursor = previous page key)
    if (!pageKeys[page - 1] && page > 1) {
      // Load sequentially until we reach the desired page
      let nextPage = currentPage;
      while (nextPage < page && pageKeys[nextPage]) {
        nextPage += 1;
        await loadCallsPage(nextPage);
      }
      return;
    }
    await loadCallsPage(page);
  };

  const handleNext = async () => {
    if (!canGoNext) return;
    await handlePageChange(currentPage + 1);
  };

  const handlePrev = async () => {
    if (!canGoPrev) return;
    await handlePageChange(currentPage - 1);
  };

  const handleFirst = async () => {
    await handlePageChange(1);
  };

  const handleLast = async () => {
    if (!totalPages) return;
    await handlePageChange(totalPages);
  };

  const PaginationControls = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} {totalPages ? `of ${totalPages}` : ''}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleFirst} disabled={!canGoPrev || isPaging}>
          First
        </Button>
        <Button variant="outline" onClick={handlePrev} disabled={!canGoPrev || isPaging}>
          Previous
        </Button>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={currentPage}
          onChange={(e) => void handlePageChange(Number(e.target.value))}
          disabled={isPaging}
        >
          {paginationOptions.map((page) => (
            <option key={page} value={page}>
              Page {page}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={handleNext} disabled={!canGoNext || isPaging}>
          Next
        </Button>
        <Button variant="outline" onClick={handleLast} disabled={!totalPages || !canGoNext || isPaging}>
          Last
        </Button>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => void loadCallsPage(1, true)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Calls"
        title="Every conversation in one place."
        subtitle="Search recent calls, review outcomes, and follow up on leads without digging through your phone."
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search calls by name, phone, or summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calls List */}
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">{PaginationControls}</div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse border-b border-gray-200 pb-3">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : calls.length > 0 ? (
            <div className="space-y-3">
              {calls.map((call) => (
                <div
                  key={call.call_id}
                  className="border border-emerald-100/70 bg-white/85 rounded-xl p-4 hover:-translate-y-[1px] hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleViewCall(call.call_id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="bg-emerald-50 p-2 rounded-full border border-emerald-100 mt-0.5">
                        <PhoneCall className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-slate-900 truncate">
                            {call.caller_name ? `${call.caller_name} - ${call.caller_phone}` : call.caller_phone}
                          </div>
                          {(() => {
                            const o = getOutcome(call);
                            return (
                              <Badge variant="outline" className={o.className}>
                                {o.label}
                              </Badge>
                            );
                          })()}
                          {(() => {
                            const s = getStatusBadge(call.status);
                            return (
                              <Badge variant="outline" className={s.className}>
                                {s.label}
                              </Badge>
                            );
                          })()}
                        </div>

                        <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(call.created_at)}</span>
                          <span className="text-slate-300">-</span>
                          <span>{formatDuration(call.duration)}</span>
                        </div>

                        {call.summary ? (
                          <p className="text-sm text-slate-700 mt-2 line-clamp-2">{call.summary}</p>
                        ) : (
                          <p className="text-sm text-slate-500 mt-2">No summary yet.</p>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-300 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Phone className="h-10 w-10" />}
              title="No calls yet"
              description="Your AI receptionist will handle calls automatically when your business is unavailable."
            />
          )}
          <div className="mt-4">{PaginationControls}</div>
        </CardContent>
      </Card>
    </div>
  );
}
