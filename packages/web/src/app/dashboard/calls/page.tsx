'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/audio-player';
import { Phone, Search, ChevronRight, Clock, PhoneCall } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Call {
  call_id: string;
  caller_phone: string;
  caller_name?: string;
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
  collected_info?: any;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handleViewCall = async (callId: string) => {
    try {
      const call = await apiClient.getCallById(callId);
      setSelectedCall(call);
      setIsDialogOpen(true);
    } catch (err: any) {
      console.error('Error loading call details:', err);
      setError(err?.message || 'Failed to load call');
    }
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
    if (call.summary || call.transcript || call.collected_info) {
      return { label: 'Possible Lead', className: 'bg-blue-50 text-blue-700 border-blue-200' };
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
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calls</h1>
        <p className="mt-2 text-gray-600">View and manage your call history</p>
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
                  className="border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => handleViewCall(call.call_id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="bg-blue-50 p-2 rounded-full border border-blue-100 mt-0.5">
                        <PhoneCall className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-gray-900 truncate">
                            {call.caller_name ? `${call.caller_name} • ${call.caller_phone}` : call.caller_phone}
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

                        <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(call.created_at)}</span>
                          <span className="text-gray-300">•</span>
                          <span>{formatDuration(call.duration)}</span>
                        </div>

                        {call.summary ? (
                          <p className="text-sm text-gray-700 mt-2 line-clamp-2">{call.summary}</p>
                        ) : (
                          <p className="text-sm text-gray-500 mt-2">No summary yet.</p>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-300 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No calls yet</h3>
              <p className="text-sm text-gray-500">
                Your AI receptionist will handle calls automatically when your business is unavailable.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedCall && (
            <>
              <DialogHeader>
                <DialogTitle>Call Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-gray-900 text-lg">
                        {selectedCall.caller_name ? `${selectedCall.caller_name} • ` : ''}
                        {selectedCall.caller_phone}
                      </div>
                      {(() => {
                        const o = getOutcome(selectedCall);
                        return (
                          <Badge variant="outline" className={o.className}>
                            {o.label}
                          </Badge>
                        );
                      })()}
                      {(() => {
                        const s = getStatusBadge(selectedCall.status);
                        return (
                          <Badge variant="outline" className={s.className}>
                            {s.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(selectedCall.created_at)}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatDuration(selectedCall.duration)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700">
                      {selectedCall.summary ? selectedCall.summary : <span className="text-gray-500">No summary yet.</span>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Captured info</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700">
                      {selectedCall.collected_info ? (
                        <pre className="whitespace-pre-wrap text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-40">
                          {JSON.stringify(selectedCall.collected_info, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-gray-500">No structured info captured.</span>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recording</CardTitle>
                    <div className="text-sm text-gray-600">
                      {selectedCall.recording_url ? 'Replay the call audio.' : 'Recording not available yet.'}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedCall.recording_url ? (
                      <AudioPlayer
                        src={selectedCall.recording_url}
                        title={`Call with ${selectedCall.caller_name || selectedCall.caller_phone}`}
                      />
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Transcript</CardTitle>
                    <div className="text-sm text-gray-600">Full conversation text.</div>
                  </CardHeader>
                  <CardContent>
                    {selectedCall.transcript ? (
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-80 overflow-auto">
                        {selectedCall.transcript}
                      </pre>
                    ) : (
                      <div className="text-sm text-gray-500">Transcript not available yet.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
