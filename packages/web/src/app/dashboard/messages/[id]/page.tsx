'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePortalBasePath } from '@/lib/portal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/portal/empty-state';
import { PageHeader } from '@/components/portal/page-header';

type MessageItem = {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  created_at: number;
  status?: string;
  ai_handled?: boolean;
};

type MessageThread = {
  id: string;
  contact_name: string;
  contact_phone: string;
  last_at: number;
  lead_status?: string;
};

const leadBadge = (status?: string) => {
  if (status === 'CONVERTED') return { label: 'Booked', variant: 'success' as const };
  if (status === 'QUALIFIED' || status === 'CONTACTED') return { label: 'Lead', variant: 'warning' as const };
  return { label: 'Open', variant: 'secondary' as const };
};

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const basePath = usePortalBasePath();
  const threadId = String(params?.id || '');

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadThread = async () => {
      try {
        const result = await apiClient.getMessageThread(threadId);
        if (!active) return;
        setThread(result?.thread ?? null);
        setMessages(Array.isArray(result?.messages) ? result.messages : []);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (threadId) {
      void loadThread();
    }

    return () => {
      active = false;
    };
  }, [threadId]);

  if (!thread && !loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Conversation not found" subtitle="Try opening another thread from Messages." />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={() => router.push(`${basePath}/messages`)}>Back to Messages</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Messages"
        title={loading ? 'Loading conversation...' : thread?.contact_name || 'Conversation'}
        subtitle={thread?.contact_phone}
        actions={
          <Button variant="secondary" onClick={() => router.push(`${basePath}/messages`)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          {thread ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Last activity: {formatDateTime(thread.last_at)}</div>
              <Badge variant={leadBadge(thread.lead_status).variant}>{leadBadge(thread.lead_status).label}</Badge>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : messages.length ? (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-xl border px-3 py-2 text-sm ${
                      message.direction === 'OUTBOUND'
                        ? 'border-primary/45 bg-primary/12 text-[#d8eeff]'
                        : 'border-border bg-[#0f1115] text-foreground'
                    }`}
                  >
                    <p>{message.body}</p>
                    <p className="mt-2 text-[11px] text-text-faint">
                      {formatDateTime(message.created_at)}
                      {message.ai_handled ? (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </span>
                      ) : null}
                      {message.status ? `  -  ${message.status}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<MessageCircle className="h-6 w-6" />}
              title="No messages"
              description="This thread does not have any messages yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

