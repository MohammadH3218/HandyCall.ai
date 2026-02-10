'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/portal/page-header';
import { usePortalBasePath } from '@/lib/portal';
import { ArrowLeft, Clock, MessageCircle, Sparkles } from 'lucide-react';

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
  last_message: string;
  last_at: number;
  lead_status: 'Scheduled' | 'Lead' | 'No Lead';
  intent?: string;
  messages: MessageItem[];
};

const leadBadge = (status: MessageThread['lead_status']) => {
  if (status === 'Scheduled') {
    return { label: 'Scheduled', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (status === 'Lead') {
    return { label: 'Lead', className: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
  return { label: 'No Lead', className: 'bg-gray-50 text-gray-700 border-gray-200' };
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

  const threads = useMemo<MessageThread[]>(() => {
    const now = Date.now();
    return [
      {
        id: 'thread-mohammad',
        contact_name: 'Mohammad Hamdallah',
        contact_phone: '+1 (832) 404-1336',
        last_message: 'Perfect, Tuesday at 10:30am works. See you then.',
        last_at: now - 1000 * 60 * 12,
        lead_status: 'Scheduled',
        intent: 'Booking',
        messages: [
          {
            id: 'msg-1',
            direction: 'INBOUND',
            body: 'Hey, can you come out this week for pest control? Seeing ants in the kitchen.',
            created_at: now - 1000 * 60 * 45,
            status: 'RECEIVED',
          },
          {
            id: 'msg-2',
            direction: 'OUTBOUND',
            body: "Hi Mohammad! We can help. Are you available Tuesday 10-12 or Wednesday 2-4? Also, what's the address?",
            created_at: now - 1000 * 60 * 43,
            status: 'SENT',
            ai_handled: true,
          },
          {
            id: 'msg-3',
            direction: 'INBOUND',
            body: 'Tuesday morning works. 418 W 5th St, Houston.',
            created_at: now - 1000 * 60 * 18,
            status: 'RECEIVED',
          },
          {
            id: 'msg-4',
            direction: 'OUTBOUND',
            body: "Perfect, Tuesday at 10:30am is booked. You'll get a reminder before we arrive.",
            created_at: now - 1000 * 60 * 12,
            status: 'DELIVERED',
            ai_handled: true,
          },
        ],
      },
      {
        id: 'thread-karen',
        contact_name: 'Karen Lopez',
        contact_phone: '+1 (832) 555-0182',
        last_message: 'Thanks, I will confirm with my landlord.',
        last_at: now - 1000 * 60 * 95,
        lead_status: 'Lead',
        intent: 'Estimate',
        messages: [
          {
            id: 'msg-5',
            direction: 'INBOUND',
            body: "Do you offer termite inspection and what's the price range?",
            created_at: now - 1000 * 60 * 120,
            status: 'RECEIVED',
          },
          {
            id: 'msg-6',
            direction: 'OUTBOUND',
            body: 'Yes, we do termite inspections. Typical range is $150-$250 depending on size. Want me to schedule a visit?',
            created_at: now - 1000 * 60 * 110,
            status: 'DELIVERED',
            ai_handled: true,
          },
          {
            id: 'msg-7',
            direction: 'INBOUND',
            body: 'Thanks, I will confirm with my landlord.',
            created_at: now - 1000 * 60 * 95,
            status: 'RECEIVED',
          },
        ],
      },
      {
        id: 'thread-no-lead',
        contact_name: 'Unknown',
        contact_phone: '+1 (281) 555-0119',
        last_message: 'No thanks.',
        last_at: now - 1000 * 60 * 210,
        lead_status: 'No Lead',
        intent: 'Pricing',
        messages: [
          {
            id: 'msg-8',
            direction: 'INBOUND',
            body: 'How much for a one-time roach treatment?',
            created_at: now - 1000 * 60 * 230,
            status: 'RECEIVED',
          },
          {
            id: 'msg-9',
            direction: 'OUTBOUND',
            body: 'One-time roach treatment typically starts at $199. Want me to check availability?',
            created_at: now - 1000 * 60 * 220,
            status: 'DELIVERED',
            ai_handled: true,
          },
          {
            id: 'msg-10',
            direction: 'INBOUND',
            body: 'No thanks.',
            created_at: now - 1000 * 60 * 210,
            status: 'RECEIVED',
          },
        ],
      },
    ];
  }, []);

  const thread = threads.find((item) => item.id === threadId) ?? threads[0];

  if (!thread) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader eyebrow="Messages" title="Conversation not found" subtitle="Try another thread from Messages." />
        <Button onClick={() => router.push(`${basePath}/messages`)}>Back to Messages</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Messages"
        title={thread.contact_name}
        subtitle={thread.contact_phone}
        actions={
          <Button variant="outline" onClick={() => router.push(`${basePath}/messages`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>{thread.intent || 'Conversation'}</span>
              <span className="text-slate-300">-</span>
              <Clock className="h-4 w-4" />
              <span>{formatDateTime(thread.last_at)}</span>
            </div>
            <Badge variant="outline" className={leadBadge(thread.lead_status).className}>
              {leadBadge(thread.lead_status).label}
            </Badge>
          </div>

          <div className="space-y-3">
            {thread.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.direction === 'OUTBOUND'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p>{msg.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                    <span>{formatDateTime(msg.created_at)}</span>
                    {msg.ai_handled ? (
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    ) : null}
                    {msg.status ? <span> - {msg.status}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
