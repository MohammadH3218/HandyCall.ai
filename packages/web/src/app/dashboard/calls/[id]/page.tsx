'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/audio-player';
import { PageHeader } from '@/components/portal/page-header';
import { ArrowLeft, User, Calendar, ExternalLink, AlertCircle } from 'lucide-react';

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

export default function CallDetailsPage() {
  const router = useRouter();
  const basePath = usePortalBasePath();
  const params = useParams();
  const callId = params?.id as string;

  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (callId) {
      loadCallDetails();
    }
  }, [callId]);

  useEffect(() => {
    if (!callId || !call) return;
    const status = (call.status || '').toUpperCase();
    if (status !== 'COMPLETED') return;
    if (call.recording_url && call.transcript) return;

    const interval = window.setInterval(() => {
      void loadCallDetails(true);
    }, 10_000);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 120_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [callId, call?.status, call?.recording_url, call?.transcript]);

  async function loadCallDetails(silent?: boolean) {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const callData = await apiClient.getCallById(callId);
      setCall(callData);
    } catch (err: any) {
      console.error('Error loading call details:', err);
      setError(err?.message || 'Failed to load call details');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

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

  const extractAddressLine = (info?: any): string => {
    if (!info) return '';
    const raw = info.address ?? info.service_address ?? info.location_address;
    if (typeof raw === 'string') return raw.trim();
    if (raw && typeof raw === 'object') {
      const parts = [raw.street, raw.city, raw.state, raw.zip].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    const fallbackParts = [info.street, info.city, info.state, info.zip].filter(Boolean);
    return fallbackParts.length ? fallbackParts.join(', ') : '';
  };

  if (isLoading) {
    return (
      <div className="p-8 animate-fade-up">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.push(`${basePath}/calls`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calls
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading call details...</p>
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="p-8 animate-fade-up">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => router.push(`${basePath}/calls`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calls
          </Button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Call</h3>
          <p className="text-red-600 mb-4">{error || 'Call not found'}</p>
          <Button onClick={() => void loadCallDetails()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const outcome = getOutcome(call);
  const statusBadge = getStatusBadge(call.status);
  const addressLine = extractAddressLine(call.collected_info);
  const mapQuery = addressLine ? encodeURIComponent(addressLine) : '';
  const mapEmbedUrl = mapQuery ? `https://maps.google.com/maps?output=embed&q=${mapQuery}` : '';
  const mapLink = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : '';

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Call details"
        title={call.caller_name ? `${call.caller_name} - ${call.caller_phone}` : call.caller_phone}
        subtitle={`${formatDate(call.created_at)} · ${formatDuration(call.duration)}`}
        actions={
          <Button variant="outline" onClick={() => router.push(`${basePath}/calls`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calls
          </Button>
        }
        meta={
          <>
            <Badge variant="outline" className={outcome.className}>
              {outcome.label}
            </Badge>
            <Badge variant="outline" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          </>
        }
      />

      {/* Associations - Contact & Appointment */}
      {(call.contact_id || call.appointment_id) && (
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {call.contact_id && (
            <Card
              className="cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
              onClick={() => router.push(`${basePath}/customers?contact=${call.contact_id}`)}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="bg-emerald-50 p-3 rounded-full">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Associated Contact</p>
                  <p className="text-sm text-slate-500">View customer profile</p>
                </div>
                <ExternalLink className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
          )}
          {call.appointment_id && (
            <Card
              className="cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
              onClick={() => router.push(`${basePath}/appointments?appointment=${call.appointment_id}`)}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="bg-emerald-50 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Booked Appointment</p>
                  <p className="text-sm text-slate-500">View appointment details</p>
                </div>
                <ExternalLink className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Captured Info + Location */}
      <div
        className={`grid gap-6 mb-6 ${addressLine ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''}`}
      >
        <Card>
          <CardHeader>
            <CardTitle>Captured Information</CardTitle>
          </CardHeader>
          <CardContent>
            {call.collected_info && Object.keys(call.collected_info).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(call.collected_info).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start gap-4 pb-3 border-b last:border-b-0">
                    <span className="text-sm text-slate-500 capitalize font-medium">{key.replace(/_/g, ' ')}</span>
                    {key.toLowerCase().includes('address') && mapLink ? (
                      <a
                        className="text-sm font-semibold text-emerald-700 text-right hover:underline"
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {String(value)}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900 text-right">{String(value)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">No structured information captured during this call.</p>
            )}
          </CardContent>
        </Card>
        {addressLine ? (
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <iframe title="Service location" src={mapEmbedUrl} className="h-48 w-full" loading="lazy" />
              </div>
              <div className="text-sm text-slate-600">{addressLine}</div>
              <Button variant="outline" size="sm" onClick={() => window.open(mapLink, '_blank')}>
                Open in Maps
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Call Recording */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Call Recording</CardTitle>
          <p className="text-sm text-slate-600">
            {call.recording_url ? 'Listen to the complete call recording.' : 'Recording is not available yet.'}
          </p>
        </CardHeader>
        <CardContent>
          {call.recording_url ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <AudioPlayer
                src={call.recording_url}
                title={`Call with ${call.caller_name || call.caller_phone}`}
              />
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-lg">
              <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Recording will be available shortly after the call completes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Full Transcript</CardTitle>
          <p className="text-sm text-slate-600">Complete conversation text from the call.</p>
        </CardHeader>
        <CardContent>
          {call.transcript ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 max-h-[600px] overflow-auto">
              <div className="space-y-2">
                {call.transcript.split('\n').filter(Boolean).map((line, idx) => {
                  const isCaller = line.startsWith('Caller:');
                  const isAssistant = line.startsWith('Assistant:');
                  const label = isCaller ? 'Caller' : isAssistant ? 'Assistant' : null;
                  const text = label ? line.replace(/^Caller:\s*|^Assistant:\s*/, '') : line;
                  return (
                    <div key={idx} className="flex gap-3">
                      {label ? (
                        <span
                          className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${
                            isCaller ? 'text-slate-600' : 'text-emerald-700'
                          }`}
                        >
                          {label}
                        </span>
                      ) : (
                        <span className="shrink-0 w-16" />
                      )}
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-lg">
              <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Transcript is not available yet. It will be generated after the call ends.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
