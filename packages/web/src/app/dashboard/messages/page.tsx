'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/portal/page-header';
import { usePortalBasePath } from '@/lib/portal';
import { Clock, MessageCircle, Search } from 'lucide-react';

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

export default function MessagesPage() {
  const threads = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: 'thread-mohammad',
        contact_name: 'Mohammad Hamdallah',
        contact_phone: '+1 (832) 404-1336',
        last_message: 'Perfect, Tuesday at 10:30am works. See you then.',
        last_at: now - 1000 * 60 * 12,
        lead_status: 'Scheduled' as const,
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
        lead_status: 'Lead' as const,
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
        lead_status: 'No Lead' as const,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const basePath = usePortalBasePath();

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => {
      const text = `${thread.contact_name} ${thread.contact_phone} ${thread.last_message}`.toLowerCase();
      return text.includes(q);
    });
  }, [threads, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageThreads = filteredThreads.slice(pageStart, pageStart + pageSize);

  const handleSearch = () => {
    if (!filteredThreads.length) return;
    setCurrentPage(1);
    router.push(`${basePath}/messages/${filteredThreads[0].id}`);
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const PaginationControls = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setCurrentPage(1)} disabled={!canGoPrev}>
          First
        </Button>
        <Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={!canGoPrev}>
          Previous
        </Button>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={currentPage}
          onChange={(e) => setCurrentPage(Number(e.target.value))}
        >
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
            <option key={page} value={page}>
              Page {page}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={!canGoNext}>
          Next
        </Button>
        <Button variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={!canGoNext}>
          Last
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Messages"
        title="AI SMS conversations"
        subtitle="Your AI handles text conversations, checks availability, and books jobs automatically."
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search conversations by name, phone, or message..."
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

      <Card>
        <CardHeader>
          <CardTitle>Message inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">{PaginationControls}</div>
          <div className="space-y-3">
            {pageThreads.map((thread) => {
              const lead = leadBadge(thread.lead_status);
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => router.push(`${basePath}/messages/${thread.id}`)}
                  className="w-full text-left rounded-xl border border-emerald-100/70 bg-white/85 p-4 hover:-translate-y-[1px] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-slate-900 truncate">{thread.contact_name}</div>
                        <Badge variant="outline" className={lead.className}>
                          {lead.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{thread.contact_phone}</div>
                      <div className="text-sm text-slate-700 mt-3 line-clamp-2">{thread.last_message}</div>
                      <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(thread.last_at)}
                      </div>
                    </div>
                    <MessageCircle className="h-5 w-5 text-emerald-600 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4">{PaginationControls}</div>
        </CardContent>
      </Card>
    </div>
  );
}
