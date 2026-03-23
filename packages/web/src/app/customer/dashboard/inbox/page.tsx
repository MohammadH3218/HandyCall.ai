'use client';

import { useState } from 'react';
import { IconSearch, IconSend, IconPaperclip, IconDots, IconPhone } from '@tabler/icons-react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const CONVERSATIONS = [
  {
    id: '1',
    pro: 'Khalid Al-Rashidi',
    service: 'AC & HVAC',
    avatar: 'K',
    color: 'bg-blue-600',
    lastMessage: 'I can come by tomorrow at 2 PM for the inspection.',
    time: '10 min ago',
    unread: 2,
    online: true,
  },
  {
    id: '2',
    pro: 'Sara Al-Mutairi',
    service: 'House Cleaning',
    avatar: 'S',
    color: 'bg-purple-600',
    lastMessage: 'The deep clean is scheduled for Thursday. See you then!',
    time: '2 hr ago',
    unread: 0,
    online: false,
  },
  {
    id: '3',
    pro: 'Ahmed Al-Zahrani',
    service: 'Electrical',
    avatar: 'A',
    color: 'bg-amber-600',
    lastMessage: 'Thank you for the review! Happy to help again.',
    time: 'Mar 19',
    unread: 0,
    online: false,
  },
  {
    id: '4',
    pro: 'Omar Al-Hassan',
    service: 'Plumbing',
    avatar: 'O',
    color: 'bg-emerald-600',
    lastMessage: 'Parts have arrived. I can fix the leak on Saturday.',
    time: 'Mar 17',
    unread: 0,
    online: true,
  },
];

const MESSAGES: Record<string, Array<{ id: string; text: string; sender: 'customer' | 'pro'; time: string }>> = {
  '1': [
    { id: '1', text: 'Hi Khalid, my AC stopped cooling last night. Can you come check it?', sender: 'customer', time: '9:00 AM' },
    { id: '2', text: 'Of course! What city are you in and what type of unit do you have?', sender: 'pro', time: '9:05 AM' },
    { id: '3', text: 'I\'m in Riyadh, Al Olaya district. It\'s a split unit, Samsung 2.5 ton.', sender: 'customer', time: '9:07 AM' },
    { id: '4', text: 'Got it. Most likely a refrigerant issue or dirty filter. I can diagnose today afternoon or tomorrow morning. What works for you?', sender: 'pro', time: '9:12 AM' },
    { id: '5', text: 'Tomorrow morning is better, around 10 AM?', sender: 'customer', time: '9:15 AM' },
    { id: '6', text: 'I can come by tomorrow at 2 PM for the inspection.', sender: 'pro', time: '9:20 AM' },
  ],
  '2': [
    { id: '1', text: 'Hi Sara, I need a full deep clean before Eid. 4 bedroom villa in Jeddah.', sender: 'customer', time: 'Mar 20' },
    { id: '2', text: 'That sounds perfect! I have Thursday 9 AM - 3 PM available. That should be plenty of time for a 4 bed villa.', sender: 'pro', time: 'Mar 20' },
    { id: '3', text: 'Thursday works great. What do I need to prepare?', sender: 'customer', time: 'Mar 20' },
    { id: '4', text: 'The deep clean is scheduled for Thursday. See you then!', sender: 'pro', time: 'Mar 20' },
  ],
  '3': [
    { id: '1', text: 'Ahmed, the lights in the living room keep flickering. Is this dangerous?', sender: 'customer', time: 'Mar 18' },
    { id: '2', text: 'It could be a loose connection or failing dimmer. Not immediately dangerous but should be checked. Can I come Sunday?', sender: 'pro', time: 'Mar 18' },
    { id: '3', text: 'Sunday at 4 PM works!', sender: 'customer', time: 'Mar 18' },
    { id: '4', text: 'Fixed the loose neutral in the junction box. All safe now!', sender: 'pro', time: 'Mar 19' },
    { id: '5', text: 'Thank you! Leaving you a 5-star review.', sender: 'customer', time: 'Mar 19' },
    { id: '6', text: 'Thank you for the review! Happy to help again.', sender: 'pro', time: 'Mar 19' },
  ],
  '4': [
    { id: '1', text: 'Omar, there\'s a slow leak under my kitchen sink. Not urgent but need it fixed.', sender: 'customer', time: 'Mar 16' },
    { id: '2', text: 'I\'ll check what part you need. Can you send a quick photo of the pipe connection?', sender: 'pro', time: 'Mar 16' },
    { id: '3', text: '[Photo attached]', sender: 'customer', time: 'Mar 16' },
    { id: '4', text: 'Looks like the P-trap seal is worn out. I need to order the part. Should be 1-2 days.', sender: 'pro', time: 'Mar 16' },
    { id: '5', text: 'Parts have arrived. I can fix the leak on Saturday.', sender: 'pro', time: 'Mar 17' },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomerInboxPage() {
  const [activeId, setActiveId] = useState('1');
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [localMessages, setLocalMessages] = useState(MESSAGES);

  const filtered = CONVERSATIONS.filter(
    (c) =>
      search === '' ||
      c.pro.toLowerCase().includes(search.toLowerCase()) ||
      c.service.toLowerCase().includes(search.toLowerCase()),
  );

  const active = CONVERSATIONS.find((c) => c.id === activeId);
  const messages = localMessages[activeId] ?? [];

  function sendMessage() {
    if (!newMessage.trim()) return;
    const msg = {
      id: String(Date.now()),
      text: newMessage.trim(),
      sender: 'customer' as const,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setLocalMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), msg],
    }));
    setNewMessage('');
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Conversation list ──────────────────────────────────────────────── */}
      <div className="flex w-72 flex-shrink-0 flex-col border-r border-slate-100">
        {/* Search */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <IconSearch className="h-4 w-4 flex-shrink-0 text-slate-400" stroke={1.8} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                activeId === conv.id ? 'bg-emerald-50' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${conv.color} text-sm font-bold text-white`}
                >
                  {conv.avatar}
                </span>
                {conv.online && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <p className={`truncate text-sm font-semibold ${activeId === conv.id ? 'text-emerald-800' : 'text-slate-800'}`}>
                    {conv.pro}
                  </p>
                  <span className="flex-shrink-0 text-[11px] text-slate-400">{conv.time}</span>
                </div>
                <p className="truncate text-xs text-slate-400">{conv.service}</p>
                <p className={`mt-0.5 truncate text-xs ${conv.unread ? 'font-medium text-slate-700' : 'text-slate-400'}`}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unread > 0 && (
                <span className="mt-1 flex-shrink-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-bold text-white">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message thread ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Thread header */}
        {active && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${active.color} text-sm font-bold text-white`}
                >
                  {active.avatar}
                </span>
                {active.online && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{active.pro}</p>
                <p className="text-xs text-slate-400">
                  {active.service} · {active.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <IconPhone className="h-4 w-4" stroke={1.8} />
              </button>
              <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <IconDots className="h-4 w-4" stroke={1.8} />
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 p-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === 'customer'
                    ? 'rounded-br-sm bg-emerald-600 text-white'
                    : 'rounded-bl-sm bg-slate-100 text-slate-800'
                }`}
              >
                <p>{msg.text}</p>
                <p
                  className={`mt-1 text-right text-[11px] ${
                    msg.sender === 'customer' ? 'text-emerald-200' : 'text-slate-400'
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <button className="flex-shrink-0 p-1 text-slate-400 transition hover:text-slate-600">
              <IconPaperclip className="h-5 w-5" stroke={1.8} />
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none bg-transparent py-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="flex-shrink-0 rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              <IconSend className="h-4 w-4" stroke={1.8} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-slate-400">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
