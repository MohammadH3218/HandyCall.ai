'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AudioPlayer } from '@/components/audio-player';
import { Phone, Search, ChevronRight } from 'lucide-react';
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

      {/* Search Bar */}
      <div className="mb-6 flex gap-2">
        <Input
          type="text"
          placeholder="Search calls by name, phone, or summary..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

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
            <div className="space-y-4">
              {calls.map((call) => (
                <div
                  key={call.call_id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                  onClick={() => handleViewCall(call.call_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Phone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {call.caller_name || call.caller_phone}
                          </h3>
                          <p className="text-sm text-gray-500">{call.caller_phone}</p>
                        </div>
                      </div>

                      {call.summary && (
                        <p className="text-sm text-gray-600 ml-12 mb-2">{call.summary}</p>
                      )}

                      <div className="flex items-center gap-4 ml-12 text-xs text-gray-500">
                        <span>{formatDate(call.created_at)}</span>
                        <span>{formatDuration(call.duration)}</span>
                        {call.sentiment && (
                          <span className={`px-2 py-1 rounded-full ${getSentimentColor(call.sentiment)}`}>
                            {call.sentiment}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400" />
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedCall && (
            <>
              <DialogHeader>
                <DialogTitle>Call Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Caller Information</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Name:</span>{' '}
                      {selectedCall.caller_name || 'Unknown'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Phone:</span> {selectedCall.caller_phone}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Date:</span>{' '}
                      {formatDate(selectedCall.created_at)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Duration:</span>{' '}
                      {formatDuration(selectedCall.duration)}
                    </p>
                  </div>
                </div>

                {selectedCall.summary && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedCall.summary}
                    </p>
                  </div>
                )}

                {selectedCall.recording_url && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Recording</h3>
                    <AudioPlayer
                      src={selectedCall.recording_url}
                      title={`Call with ${selectedCall.caller_name || selectedCall.caller_phone}`}
                    />
                  </div>
                )}

                {selectedCall.transcript && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Transcript</h3>
                    <div className="bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {selectedCall.transcript}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
