import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import {
  IconPhone,
  IconCalendar,
  IconMessage,
  IconChartBar,
  IconArrowRight,
  IconClock,
  IconUsers,
  IconCreditCard,
  IconAddressBook,
  IconFileInvoice,
  IconRepeat,
  IconArrowsExchange,
  IconShieldCheck,
  IconCircleCheck,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'HandyCall — AI Receptionist, Payments & CRM for Service Professionals',
  description:
    'Never miss a customer call again. HandyCall answers calls 24/7, auto-books appointments, manages your payments, and runs your CRM — all in one place. Try free for 14 days.',
  openGraph: {
    title: 'HandyCall for Service Professionals',
    description:
      'AI receptionist, payment management, and built-in CRM for local pros — all in one platform.',
  },
};

/* ─────────────────────────────────────────────────────────────────────
   Data arrays — ALL Tailwind classes written in full (no interpolation)
───────────────────────────────────────────────────────────────────── */

const platformStats = [
  { value: '24/7', label: 'AI availability', sub: 'No staff required' },
  { value: '< 2s', label: 'Average answer time', sub: 'Every call, every time' },
  { value: '500+', label: 'Service pros', sub: 'Active on HandyCall' },
  { value: '4.8★', label: 'Platform rating', sub: 'Based on user reviews' },
];

const trustItems = [
  { icon: IconPhone, text: '24/7 AI call handling' },
  { icon: IconCalendar, text: 'Live calendar booking' },
  { icon: IconCreditCard, text: 'Built-in payment hub' },
  { icon: IconAddressBook, text: 'Full CRM included' },
  { icon: IconShieldCheck, text: 'Stripe-powered & secure' },
  { icon: IconUsers, text: '500+ service pros' },
];

const aiFeatureCards = [
  {
    icon: IconPhone,
    title: 'Answers in Under 2 Seconds',
    desc: 'Your AI picks up every call, day or night, even on holidays — no voicemail, no missed revenue.',
  },
  {
    icon: IconCalendar,
    title: 'Live Calendar Booking',
    desc: 'Callers choose from your real availability. Jobs land on your schedule automatically.',
  },
  {
    icon: IconMessage,
    title: 'Automated Follow-ups',
    desc: 'SMS confirmations, reminders, and recaps go out automatically — keeping no-shows low.',
  },
  {
    icon: IconChartBar,
    title: 'Call Summaries to Inbox',
    desc: 'Every call gets summarized and delivered to you. Know exactly what happened on every call.',
  },
];

const paymentCards = [
  {
    icon: IconCreditCard,
    title: 'One-Time Payments',
    desc: 'Accept job deposits and full payments instantly. Share a payment link via SMS.',
  },
  {
    icon: IconRepeat,
    title: 'Recurring Subscriptions',
    desc: 'Set up monthly or annual service plans with custom pricing and billing intervals.',
  },
  {
    icon: IconFileInvoice,
    title: 'Professional Invoicing',
    desc: 'Create and send invoices in seconds. Track paid, outstanding, and overdue — automatically.',
  },
  {
    icon: IconShieldCheck,
    title: 'Stripe-Powered Payouts',
    desc: 'Funds go directly to your bank account on your schedule. Fully encrypted.',
  },
];

const crmCards = [
  {
    icon: IconAddressBook,
    title: 'Auto-Built Contact Profiles',
    desc: 'Every caller becomes a contact with full call, booking, and payment history.',
  },
  {
    icon: IconUsers,
    title: 'Lead Pipeline Tracking',
    desc: 'Track leads from New → Qualified → Converted with status tags per customer.',
  },
  {
    icon: IconArrowsExchange,
    title: 'Connect Your Existing CRM',
    desc: 'Already using a CRM? HandyCall plays well with others. Plug in what you need.',
  },
  {
    icon: IconMessage,
    title: 'Notes & Re-Engagement',
    desc: 'See which customers are overdue for follow-up. Add notes per contact instantly.',
  },
];

// Payment rows — full color classes inlined
const paymentRows = [
  {
    label: 'Monthly Lawn Care Plan',
    amount: '$120/mo',
    badge: 'Subscription',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    label: 'One-Time Deep Clean',
    amount: '$350',
    badge: 'Succeeded',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Tree Trimming Deposit',
    amount: '$75',
    badge: 'Succeeded',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Emergency Repair',
    amount: '$225',
    badge: 'Refunded',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    label: 'HVAC Tune-Up',
    amount: '$180',
    badge: 'Pending',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-600',
  },
];

// CRM contact rows — full color classes inlined
const crmContacts = [
  {
    initials: 'SM',
    name: 'Sarah M.',
    detail: '3 appointments · $840 lifetime',
    tag: 'VIP',
    tagClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    initials: 'JR',
    name: 'James R.',
    detail: '1 call · Quoted $320',
    tag: 'Lead',
    tagClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    initials: 'LT',
    name: 'Linda T.',
    detail: 'Monthly plan · $120/mo',
    tag: 'Subscriber',
    tagClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    initials: 'MD',
    name: 'Mike D.',
    detail: 'No follow-up in 60 days',
    tag: 'Re-engage',
    tagClass: 'border-red-200 bg-red-50 text-red-700',
  },
];

// Recent calls in dashboard — full color classes inlined
const recentCalls = [
  {
    initial: 'J',
    name: 'John P.',
    time: '2 min ago',
    status: 'Booked',
    statusClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dotClass: 'bg-emerald-400',
  },
  {
    initial: 'M',
    name: 'Maria S.',
    time: '18 min ago',
    status: 'Quoted',
    statusClass: 'bg-blue-50 border-blue-200 text-blue-700',
    dotClass: 'bg-blue-400',
  },
  {
    initial: 'T',
    name: 'Tom R.',
    time: '1 hr ago',
    status: 'Follow-up',
    statusClass: 'bg-amber-50 border-amber-200 text-amber-700',
    dotClass: 'bg-amber-400',
  },
];

const statCards = [
  { label: 'Calls Today', value: '12', sub: '+3 booked', subClass: 'text-emerald-600' },
  { label: 'Revenue MTD', value: '$4,280', sub: '↑ 18%', subClass: 'text-blue-600' },
  { label: 'Open Leads', value: '7', sub: '2 urgent', subClass: 'text-amber-600' },
];

const steps = [
  {
    number: '01',
    title: 'Sign Up & Set Up',
    subtitle: '5 minutes',
    description:
      'Create your account and fill out your service profile. Tell us your service area, pricing, and availability.',
  },
  {
    number: '02',
    title: 'Forward Your Business Number',
    subtitle: 'Instant',
    description:
      'Forward your existing business number to your HandyCall line. Works with any carrier — no new number needed.',
  },
  {
    number: '03',
    title: 'Never Miss Another Lead',
    subtitle: 'Starting immediately',
    description:
      'Your AI handles every call, books jobs, collects payments, sends confirmations, and delivers a daily summary to your inbox.',
  },
];

const platformCapabilities = [
  {
    icon: IconPhone,
    title: 'AI Receptionist',
    desc: 'Answer every call 24/7, qualify leads, and book appointments — automatically.',
  },
  {
    icon: IconCreditCard,
    title: 'Payment Hub',
    desc: 'Accept one-time payments, set up recurring subscriptions, issue refunds, track all revenue.',
  },
  {
    icon: IconAddressBook,
    title: 'Customer CRM',
    desc: 'Full contact history, lead tracking, notes, appointment records — all per customer.',
  },
  {
    icon: IconArrowsExchange,
    title: 'Connect Your Tools',
    desc: 'Already have a CRM? HandyCall plays well with others. Use what you need.',
  },
];

/* ─────────────────────────────────────────────────────────────────────
   Page component
───────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white pt-24 pb-0">
        {/* Subtle radial background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px]"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(16,185,129,0.09) 0%, transparent 75%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <FadeIn>
            {/* Pulsing live badge */}
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                AI Receptionist · Live 24/7
              </span>
            </div>

            {/* H1 with shimmer accent */}
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              The front desk
              <br className="hidden sm:block" />
              your business{' '}
              <span
                style={{
                  background:
                    'linear-gradient(135deg, #059669 0%, #10b981 35%, #34d399 65%, #059669 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'hc-shimmer 4s linear infinite',
                }}
              >
                deserves.
              </span>
            </h1>

            {/* Keyframe injected via style tag — safe in Next.js App Router */}
            <style>{`
              @keyframes hc-shimmer {
                0%   { background-position: 0% center; }
                100% { background-position: 200% center; }
              }
              @keyframes hc-float {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-8px); }
              }
            `}</style>

            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-slate-500">
              HandyCall answers every call, books appointments, manages your payments,
              and runs your customer relationships — all in one place.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-200/60 transition-all hover:bg-emerald-700 hover:shadow-emerald-300/60 hover:-translate-y-0.5"
              >
                Start Free 14-Day Trial
                <IconArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  stroke={2}
                />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5"
              >
                View Pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">No credit card required · Cancel anytime</p>
          </FadeIn>

          {/* Floating platform stat cards */}
          <FadeIn delay={200}>
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {platformStats.map((stat, i) => (
                <div
                  key={stat.value}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-5 shadow-sm"
                  style={{ animation: `hc-float ${3 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
                >
                  <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-700">{stat.label}</p>
                  <p className="text-xs text-slate-400">{stat.sub}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* ── Hero dashboard preview ───────────────────────────────── */}
        <FadeIn delay={320}>
          <div className="relative mx-auto mt-12 max-w-5xl px-4">
            <div className="overflow-hidden rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-2xl shadow-slate-100">
              {/* Browser chrome bar */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="mx-auto flex h-6 w-72 items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-400">
                  app.handycall.ai/dashboard
                </div>
              </div>

              {/* Dashboard layout */}
              <div className="flex divide-x divide-slate-100">
                {/* Sidebar — hidden on mobile */}
                <div className="hidden w-44 flex-shrink-0 bg-slate-50 p-3 sm:block">
                  {['Dashboard', 'Calls', 'Appointments', 'Payments', 'Contacts', 'Invoices'].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={`mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                          i === 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            i === 0 ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        {item}
                      </div>
                    )
                  )}
                </div>

                {/* Main area */}
                <div className="min-w-0 flex-1 p-4 space-y-3">
                  {/* Stat cards row */}
                  <div className="grid grid-cols-3 gap-3">
                    {statCards.map((card) => (
                      <div
                        key={card.label}
                        className="rounded-xl border border-slate-100 bg-white p-3"
                      >
                        <p className="text-xs text-slate-400">{card.label}</p>
                        <p className="mt-0.5 text-lg font-bold text-slate-900">{card.value}</p>
                        <p className={`text-xs font-semibold ${card.subClass}`}>{card.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent calls table */}
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Recent Calls
                    </p>
                    {recentCalls.map((row) => (
                      <div
                        key={row.name}
                        className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            {row.initial}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{row.name}</p>
                            <p className="text-xs text-slate-400">{row.time}</p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${row.statusClass}`}
                        >
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Trust Strip ──────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-5">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            {trustItems.map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-emerald-500" stroke={1.5} />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Receptionist Feature Section ──────────────────────────── */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="mb-3 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                AI Receptionist
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Your phone, handled —{' '}
                <span className="text-emerald-600">always on.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                HandyCall answers every call in under 2 seconds, qualifies leads, and books
                jobs directly into your calendar — 24/7, no staff required.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* Left: 2×2 mini feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {aiFeatureCards.map((feat, i) => (
                <FadeIn key={feat.title} delay={i * 80}>
                  <div className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 transition group-hover:bg-emerald-100">
                      <feat.icon className="h-5 w-5 text-emerald-600" stroke={1.75} />
                    </div>
                    <h3 className="mb-1.5 text-sm font-bold text-slate-900">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{feat.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Right: Live call flow UI mockup */}
            <FadeIn delay={180}>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Live Call View
                  </p>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Active
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  {/* Incoming call card */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <IconPhone className="h-5 w-5" stroke={1.75} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Incoming call · +1 (555) 012-3456
                        </p>
                        <p className="text-xs font-medium text-emerald-600">
                          AI Receptionist answered in 1.3s
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conversation bubbles */}
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-emerald-600 px-4 py-2.5 text-xs leading-relaxed text-white">
                        "Hi! Thanks for calling HandyPro Services — I'm your virtual assistant.
                        How can I help you today?"
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-xs leading-relaxed text-slate-700">
                        "I need a quote for lawn care this Thursday."
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-emerald-600 px-4 py-2.5 text-xs leading-relaxed text-white">
                        "I can book Thursday at 10 AM or 2 PM — which works better for you?"
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-xs leading-relaxed text-slate-700">
                        "2 PM works great."
                      </div>
                    </div>
                  </div>

                  {/* Booking confirmation chip */}
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <IconCircleCheck className="h-5 w-5 flex-shrink-0 text-emerald-500" stroke={1.5} />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Appointment booked automatically
                      </p>
                      <p className="text-xs text-slate-400">
                        Thursday 2:00 PM · Confirmation SMS sent to customer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Payment Hub Section ───────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="mb-3 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Payment Hub
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Charge your customers{' '}
                <span className="text-emerald-600">your way.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                One-time jobs, monthly plans, invoices, refunds — every payment scenario handled
                in one dashboard. No accounting software required.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* Left: Payment dashboard mockup */}
            <FadeIn>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Your Payment Dashboard
                  </p>
                </div>
                <div className="space-y-2 p-4">
                  {paymentRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-400">{row.amount}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${row.badgeClass}`}>
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">MTD Revenue</p>
                  <p className="text-sm font-bold text-slate-900">$4,280 collected</p>
                </div>
              </div>
            </FadeIn>

            {/* Right: 2×2 payment feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {paymentCards.map((feat, i) => (
                <FadeIn key={feat.title} delay={i * 80}>
                  <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 transition group-hover:bg-emerald-100">
                      <feat.icon className="h-5 w-5 text-emerald-600" stroke={1.75} />
                    </div>
                    <h3 className="mb-1.5 text-sm font-bold text-slate-900">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{feat.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CRM Section ───────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="mb-3 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Built-in CRM
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Know every customer,{' '}
                <span className="text-emerald-600">not just their number.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                Every call, booking, and payment is linked to a contact. Your CRM builds itself
                as you work — or bring your existing one and we&apos;ll connect to it.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* Left: 2×2 CRM feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {crmCards.map((feat, i) => (
                <FadeIn key={feat.title} delay={i * 80}>
                  <div className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 transition group-hover:bg-emerald-100">
                      <feat.icon className="h-5 w-5 text-emerald-600" stroke={1.75} />
                    </div>
                    <h3 className="mb-1.5 text-sm font-bold text-slate-900">{feat.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{feat.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Right: CRM contacts mockup */}
            <FadeIn delay={180}>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Customer CRM
                  </p>
                  <span className="text-xs font-semibold text-emerald-600">
                    4 contacts shown
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  {crmContacts.map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {row.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                          <p className="text-xs text-slate-400">{row.detail}</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${row.tagClass}`}>
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">
                    Lead status: <span className="font-semibold text-slate-600">New → Contacted → Qualified → Converted</span>
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="mb-3 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                How It Works
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Up and running{' '}
                <span className="text-emerald-600">in minutes.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
                No technical setup. No new phone number. If you can forward a call, you can use
                HandyCall.
              </p>
            </div>
          </FadeIn>

          <div className="relative grid gap-10 sm:grid-cols-3">
            {/* Connector lines between steps */}
            <div
              aria-hidden
              className="absolute top-5 left-[calc(16.66%+28px)] hidden h-px sm:block"
              style={{
                width: 'calc(33.33% - 56px)',
                background: 'linear-gradient(to right, #d1fae5, #6ee7b7)',
              }}
            />
            <div
              aria-hidden
              className="absolute top-5 left-[calc(50%+28px)] hidden h-px sm:block"
              style={{
                width: 'calc(33.33% - 56px)',
                background: 'linear-gradient(to right, #6ee7b7, #d1fae5)',
              }}
            />

            {steps.map((step, i) => (
              <FadeIn key={step.title} delay={i * 120}>
                <div className="relative flex flex-col">
                  {/* Numbered circle */}
                  <div className="relative z-10 mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-md shadow-emerald-200">
                    {step.number}
                  </div>
                  {/* Content card */}
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-1 text-base font-bold text-slate-900">{step.title}</h3>
                    <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <IconClock className="h-3.5 w-3.5" stroke={1.5} />
                      {step.subtitle}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Capabilities Banner ──────────────────────────────── */}
      <section className="bg-emerald-600 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-200">
                Everything in one platform
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Run your entire business — or plug in what you need.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-emerald-100">
                HandyCall works as your complete business hub, or alongside the tools you already
                love. Either way, it works.
              </p>
            </div>
          </FadeIn>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformCapabilities.map((item, i) => (
              <FadeIn key={item.title} delay={i * 80}>
                <div className="flex h-full flex-col rounded-2xl border border-white/20 bg-white/10 p-5 text-white backdrop-blur-sm transition hover:bg-white/15">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <item.icon className="h-5 w-5 text-white" stroke={1.75} />
                  </div>
                  <p className="mb-2 text-base font-bold">{item.title}</p>
                  <p className="text-sm leading-relaxed text-emerald-100">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Metrics ─────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
              {[
                { value: '24/7', label: 'AI Availability', sub: 'No staff required' },
                { value: '< 2s', label: 'Answer Time', sub: 'Every call, every time' },
                { value: '500+', label: 'Service Pros', sub: 'Active on HandyCall' },
                { value: '4.8★', label: 'Platform Rating', sub: 'Based on user reviews' },
              ].map((stat) => (
                <div key={stat.value} className="flex flex-col items-center">
                  <p className="text-4xl font-extrabold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{stat.label}</p>
                  <p className="text-xs text-slate-400">{stat.sub}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28">
        {/* Light gradient background with radial emerald glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(135deg, #f8fafc 0%, #ecfdf5 50%, #f0fdf4 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60%]"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(16,185,129,0.14) 0%, transparent 75%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <span className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
              Start Today · Free 14-Day Trial
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Ready to grow
              <br className="hidden sm:block" /> your business?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-xl leading-relaxed text-slate-500">
              Join 500+ service pros who use HandyCall to answer every call, collect every
              payment, and never miss a lead.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200/60 transition-all hover:bg-emerald-700 hover:shadow-emerald-300/60 hover:-translate-y-0.5"
              >
                Start Free 14-Day Trial
                <IconArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  stroke={2}
                />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5"
              >
                View Pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              No credit card · No contracts · Cancel anytime
            </p>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
