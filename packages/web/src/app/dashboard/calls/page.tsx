'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getCalls(50);
      setCalls(response.calls || []);
    } catch (err: any) {
      console.error('Error loading calls:', err);
      setError(err.message || 'Failed to load calls');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCalls();
      return;
    }

    try {
      setIsLoading(true);
      const results = await apiClient.searchCalls(searchQuery);
      setCalls(results || []);
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

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadCalls}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-slate-900">Calls</h1>
        <p className="mt-2 text-slate-600">Review conversations, outcomes, and follow-ups.</p>
      </div>

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
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No calls yet</h3>
              <p className="text-sm text-slate-500">
                Your AI receptionist will handle calls automatically when your business is unavailable.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
