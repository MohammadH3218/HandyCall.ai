'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, ChevronLeft, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

interface Thread {
  thread_id: string;
  company_id: string;
  company_name?: string;
  last_message: string;
  last_message_at: number;
  unread: boolean;
}

interface Message {
  message_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sender_name?: string;
  created_at: number;
}

export default function PortalMessagesPage() {
  const emailKey = 'handycall-portal-email';
  const [email, setEmail] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore email from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(emailKey);
      if (saved) setEmail(saved);
    }
  }, []);

  // Load threads when email is set
  useEffect(() => {
    if (!email) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getCustomerThreads(email);
        setThreads(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [email]);

  // Load messages when thread selected
  useEffect(() => {
    if (!selectedThread) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getCustomerThreadMessages(
          selectedThread.thread_id,
          selectedThread.company_id
        );
        setMessages(data);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedThread]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes('@')) return;
    if (typeof window !== 'undefined') sessionStorage.setItem(emailKey, emailInput);
    setEmail(emailInput);
  };

  const handleSend = async () => {
    if (!selectedThread || !newMessage.trim()) return;
    setSending(true);
    try {
      await apiClient.sendCustomerMessage(selectedThread.company_id, {
        customer_email: email,
        content: newMessage.trim(),
      });
      setNewMessage('');
      // Reload messages
      const data = await apiClient.getCustomerThreadMessages(
        selectedThread.thread_id,
        selectedThread.company_id
      );
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Email gate
  if (!email) {
    return (
      <div className="max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-muted-foreground">View your conversations with service pros.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <MessageSquare className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-center font-semibold text-slate-900">Enter your email to continue</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            We use your email to find your message threads.
          </p>
          <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">View My Messages</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">{email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            if (typeof window !== 'undefined') sessionStorage.removeItem(emailKey);
            setEmail('');
            setEmailInput('');
            setThreads([]);
            setSelectedThread(null);
          }}
        >
          Switch email
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex h-[500px]">
          {/* Thread List */}
          <div className={`w-full border-r border-slate-100 flex flex-col ${selectedThread ? 'hidden sm:flex sm:w-64' : 'flex'}`}>
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">Conversations</p>
            </div>

            {loading && !selectedThread ? (
              <div className="flex-1 p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-1">
                    <div className="h-4 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-slate-600">No conversations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Messages from pros will appear here after you book or request a quote.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {threads.map((t) => (
                  <button
                    key={t.thread_id}
                    onClick={() => setSelectedThread(t)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      selectedThread?.thread_id === t.thread_id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${t.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {t.company_name || 'Service Pro'}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatTime(t.last_message_at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{t.last_message}</p>
                    {t.unread && (
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Pane */}
          {selectedThread ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Thread header */}
              <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                <button
                  className="sm:hidden text-slate-500 hover:text-slate-700"
                  onClick={() => setSelectedThread(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedThread.company_name || 'Service Pro'}
                  </p>
                  <p className="text-xs text-muted-foreground">Secure message thread</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex ${msg.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.direction === 'inbound'
                            ? 'bg-emerald-500 text-white rounded-br-sm'
                            : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                        }`}
                      >
                        {msg.sender_name && msg.direction === 'outbound' && (
                          <p className="text-xs font-semibold text-slate-500 mb-1">{msg.sender_name}</p>
                        )}
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className={`mt-1 text-xs ${msg.direction === 'inbound' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex flex-1 items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-slate-600">Select a conversation</p>
                <p className="mt-1 text-xs text-muted-foreground">Choose a thread from the left to read messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
