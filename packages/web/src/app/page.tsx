import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/marketing/site-header';
import { FadeIn } from '@/components/marketing/fade-in';
import { AnimatedCounter } from '@/components/marketing/animated-counter';
import { SiteFooter } from '@/components/marketing/site-footer';
import { AudioPlayer } from '@/components/audio-player';
import {
  ArrowRight,
  Phone,
  CalendarCheck,
  CheckCircle2,
  PhoneIncoming,
  Target,
  FileText,
  Send,
  Settings,
  BookOpen,
  Bell,
  ShieldCheck,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────── */

const benchmarks = [
  { value: '78%', label: 'of callers abandon after no answer', source: 'CallRail 2025' },
  { value: '41%', label: 'hang up after 1–2 minutes on hold', source: 'CallRail 2025' },
  { value: '21%', label: 'immediately call a competitor', source: 'CallRail 2025' },
  { value: '55%', label: 'stable staffing while handling higher call volumes with AI', source: 'Gartner 2025' },
];

const benchmarksSource =
  'Sources: CallRail survey of 1,000 U.S. consumers (2025); Gartner customer service survey (2025).';

const controls = [
  {
    icon: Settings,
    title: 'Call handling rules',
    desc: 'Set business hours, overflow behavior, and after-hours routing. No flowcharts required.',
  },
  {
    icon: BookOpen,
    title: 'Service knowledge',
    desc: 'Add pricing, policies, and FAQs so the AI answers real questions accurately.',
  },
  {
    icon: Bell,
    title: 'Follow-up automation',
    desc: 'Booking links, reminders, and confirmations sent automatically after each call.',
  },
  {
    icon: ShieldCheck,
    title: 'Spam call filtering',
    desc: 'Block robocalls and junk callers before they reach your team.',
  },
];

const industries = [
  { name: 'Pest Control', example: 'Termite inspections, rodent removal' },
  { name: 'HVAC', example: 'AC repair, furnace installs' },
  { name: 'Plumbing', example: 'Emergency leaks, water heaters' },
  { name: 'Electrical', example: 'Panel upgrades, outlet installs' },
  { name: 'Landscaping', example: 'Weekly mowing, tree trimming' },
  { name: 'Cleaning', example: 'Move-out cleans, recurring service' },
  { name: 'Garage Doors', example: 'Opener repair, spring replacement' },
  { name: 'Property Maintenance', example: 'Handyman, turnover prep' },
];

const handoffScenarios = [
  {
    title: 'Urgent safety issues',
    desc: 'Gas smells, electrical hazards, or water shutoffs trigger immediate human escalation.',
  },
  {
    title: 'Edge-case requests',
    desc: 'If a caller asks for a non-standard service, the AI collects details and hands off.',
  },
  {
    title: 'VIP or repeat customers',
    desc: 'Recognized callers can route to your team or a preferred technician automatically.',
  },
];

const setupSteps = [
  {
    title: 'Connect your number',
    desc: 'Forward or port your line. Keep your existing number and routing.',
  },
  {
    title: 'Set hours + services',
    desc: 'Define business hours, service areas, and booking rules.',
  },
  {
    title: 'Go live',
    desc: 'Start taking calls in under 10 minutes with free onboarding.',
  },
];

const trustBadges = [
  '24/7 call coverage',
  'Human fallback available',
  'TCPA-friendly scripts',
  'CRM + calendar sync',
  'Spam call filtering',
  'Uptime SLA target',
];

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteHeader />

      <main>
        {/* ═══════════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-white">
          {/* Ambient background glows */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 right-0 h-[640px] w-[640px] rounded-full bg-emerald-50/70 blur-3xl" />
            <div className="absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full bg-slate-50/80 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pb-28 lg:pt-22">
            {/* ── Left: Copy ── */}
            <div>
              <FadeIn delay={0} duration={400} direction="none">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
                  AI receptionist for service businesses
                </span>
              </FadeIn>

              <FadeIn delay={60} duration={500}>
                <h1 className="mt-5 text-[2.8rem] font-bold leading-[1.05] tracking-tight text-slate-900 md:text-[3.6rem] lg:text-[4rem]">
                  Your phones answered.{' '}
                  <span className="text-emerald-600">Your calendar filled.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={140} duration={400}>
                <p className="mt-5 max-w-[480px] text-xl leading-relaxed text-slate-500">
                  HandyCall answers every call, books the job, and sends confirmation — automatically, 24/7.
                </p>
              </FadeIn>

              <FadeIn delay={220} duration={400}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="h-12 gap-2 px-6 text-base shadow-md shadow-emerald-200/60">
                    <Link href="/register">
                      Start booking more jobs
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                    <Link href="/pricing">See pricing</Link>
                  </Button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-slate-500">
                  {['Setup in 10 minutes', 'Keep your number', 'No contracts'].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {item}
                    </span>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* ── Right: Call transcript widget ── */}
            <FadeIn delay={200} duration={600} direction="left">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/80">
                {/* macOS-style top bar */}
                <div className="flex items-center justify-between bg-slate-900 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                    </div>
                    <span className="text-xs font-medium text-slate-500">HandyCall · Live call</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Live
                    </span>
                    <span className="text-xs text-slate-500">2m 14s</span>
                  </div>
                </div>

                {/* Call context strip */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                    <Phone className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">GreenShield Pest · Inbound</p>
                    <p className="text-xs text-slate-500">Pest Control · (555) 891-2345</p>
                  </div>
                </div>

                {/* Transcript messages */}
                <div className="space-y-4 px-5 py-4 text-sm">
                  {[
                    { role: 'Caller', text: '"Hi, I need a termite inspection. Found damage near the garage."', isAI: false },
                    { role: 'HandyCall', text: '"I have Thursday at 9 AM or Friday at 2 PM open. Which works better?"', isAI: true },
                    { role: 'Caller', text: '"Thursday morning works."', isAI: false },
                    { role: 'HandyCall', text: '"You\'re booked for Thursday at 9 AM. Sending a confirmation text now."', isAI: true },
                  ].map((msg, i) => (
                    <div key={i} className="flex gap-3">
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          msg.isAI ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {msg.isAI ? 'H' : 'C'}
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${msg.isAI ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {msg.role}
                        </p>
                        <p className="mt-0.5 text-slate-700">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Captured data strip */}
                <div className="border-t border-slate-100 bg-emerald-50/60 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Booked</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Service</span>
                      <span className="font-medium text-slate-800">Termite inspection</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Booked</span>
                      <span className="font-semibold text-emerald-700">Thu 9:00 AM ✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SMS</span>
                      <span className="font-medium text-emerald-700">Delivered</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration</span>
                      <span className="font-medium text-slate-800">2m 14s</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            STATS STRIP
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <FadeIn duration={400}>
              <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
                {benchmarks.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <AnimatedCounter value={stat.value} className="block text-[2.5rem] font-bold tracking-tight text-slate-900" />
                    <p className="mt-2 text-sm leading-snug text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{stat.source}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-center text-xs text-slate-400">{benchmarksSource}</p>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PRODUCT DEMO — hear it, see it
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <FadeIn duration={400}>
              <div className="mb-14 text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Hear it in action
                </span>
                <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Sounds like your best dispatcher.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                  Real conversations. Real bookings. Not a bot.
                </p>
              </div>
            </FadeIn>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              {/* Left: audio + transcript */}
              <FadeIn delay={120} duration={500}>
                <div className="space-y-4">
                  <AudioPlayer
                    src="/audio/sample-call.wav"
                    title="Listen to a sample call"
                  />

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                      <span className="text-xs font-medium text-slate-500">
                        Transcript · Feb 4, 2026 · 7:14 PM
                      </span>
                      <span className="text-xs text-slate-400">2m 14s</span>
                    </div>
                    <div className="space-y-4 px-5 py-4 text-sm">
                      {[
                        { time: '00:08', role: 'Caller', text: '"Hi, I need a termite inspection. We saw damage near the garage."', isAI: false },
                        { time: '00:22', role: 'HandyCall', text: '"Thanks for calling GreenShield Pest. Are you available Thursday at 9 AM or Friday at 2 PM?"', isAI: true },
                        { time: '00:48', role: 'Caller', text: '"Thursday works. Address is 142 Oak St, Mesa."', isAI: false },
                        { time: '01:10', role: 'HandyCall', text: '"Booked for Thursday at 9 AM. I\'ll text you a confirmation now."', isAI: true },
                      ].map((msg, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="w-8 shrink-0 pt-[1px] text-xs text-slate-400">{msg.time}</span>
                          <div>
                            <p className={`text-xs font-semibold ${msg.isAI ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {msg.role}
                            </p>
                            <p className="mt-0.5 text-slate-700">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>

              {/* Right: booking summary + SMS */}
              <FadeIn delay={200} duration={500}>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarCheck className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-widest">Booking created</span>
                    </div>
                    <div className="mt-4 space-y-2.5 text-sm">
                      {[
                        ['Service', 'Termite inspection', false],
                        ['Caller', 'Sarah M.', false],
                        ['Address', '142 Oak St, Mesa', false],
                        ['Booked', 'Thu, Feb 6 · 9:00 AM', true],
                      ].map(([k, v, highlight]) => (
                        <div key={String(k)} className="flex items-center justify-between">
                          <span className="text-slate-500">{k}</span>
                          <span className={`font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Send className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-widest">SMS sent automatically</span>
                    </div>
                    <div className="mt-3 rounded-xl bg-white/8 border border-white/10 p-4">
                      <p className="text-sm leading-relaxed text-slate-200">
                        &ldquo;You&apos;re confirmed for Thursday at 9:00 AM. We&apos;ll see you at 142 Oak St.
                        Reply CHANGE to reschedule. — GreenShield Pest&rdquo;
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Sent Feb 4, 7:15 PM · Delivered ✓</p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            HOW IT WORKS — 4 steps
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <FadeIn duration={400}>
              <div className="mb-12 text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">How it works</span>
                <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Ring to booked in under 3 minutes.
                </h2>
              </div>
            </FadeIn>

            <FadeIn delay={120} duration={500}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: PhoneIncoming,
                    step: '01',
                    title: 'Call answered',
                    desc: 'HandyCall picks up with your greeting and service prompts loaded.',
                  },
                  {
                    icon: Target,
                    step: '02',
                    title: 'Lead qualified',
                    desc: 'Captures job type, urgency, address, and contact info from the conversation.',
                  },
                  {
                    icon: CalendarCheck,
                    step: '03',
                    title: 'Appointment booked',
                    desc: 'Proposes open slots from your live calendar. Caller picks a time.',
                  },
                  {
                    icon: Send,
                    step: '04',
                    title: 'Confirmation sent',
                    desc: 'SMS with date, time, and address sent. Record logged to dashboard.',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span className="text-sm font-bold text-emerald-700">{item.step}</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                          <Icon className="h-4 w-4 text-emerald-600" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CONFIGURATION — feature grid
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <FadeIn duration={400}>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Configuration</span>
                <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  You set the rules.{' '}
                  <span className="text-slate-400">HandyCall follows them.</span>
                </h2>
                <p className="mt-4 max-w-md text-lg text-slate-500">
                  Define your hours, services, and scripts. The AI handles calls exactly the way you would —
                  or better, because it never gets distracted.
                </p>
              </FadeIn>

              <div className="grid gap-3 sm:grid-cols-2">
                {controls.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <FadeIn key={item.title} delay={i * 80} duration={400}>
                      <div className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition-all hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-sm">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition-colors group-hover:border-emerald-200">
                          <Icon className="h-4 w-4 text-emerald-700" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CONTROL + SETUP — 2-column
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <div className="grid gap-14 lg:grid-cols-2 lg:items-start">
              {/* Handoff scenarios */}
              <FadeIn duration={400}>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Edge cases</span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  You stay in control of the tough calls.
                </h2>
                <p className="mt-3 text-lg text-slate-500">
                  HandyCall handles the routine. For safety issues or unusual requests, it escalates to your team.
                </p>
                <div className="mt-7 space-y-3">
                  {handoffScenarios.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Setup steps */}
              <FadeIn delay={120} duration={500}>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Setup</span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Go live in 10 minutes.
                </h2>
                <p className="mt-3 text-lg text-slate-500">
                  No technical setup. No flowcharts. Just forward your number and you&apos;re live.
                </p>
                <div className="mt-7 space-y-3">
                  {setupSteps.map((step, index) => (
                    <div key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7">
                  <Button asChild size="lg" className="h-12 gap-2 px-6 text-base">
                    <Link href="/register">
                      Activate your AI receptionist
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            RELIABILITY — dark section
        ═══════════════════════════════════════════════════════ */}
        <section className="bg-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <FadeIn duration={400}>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Reliability & compliance
              </span>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
                Operational safeguards built in.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-slate-400">
                TCPA-friendly scripts, spam filtering, and human fallback — so every call is handled correctly.
              </p>
            </FadeIn>

            <FadeIn delay={120} duration={400}>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-slate-700 bg-slate-800/70 px-4 py-1.5 text-sm text-slate-300"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={200} duration={400}>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 gap-2 bg-white px-6 text-base text-slate-900 hover:bg-slate-100">
                  <Link href="/register">
                    Turn calls into revenue
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-slate-700 bg-transparent px-6 text-base text-slate-200 hover:bg-slate-800"
                >
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            INDUSTRIES
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <FadeIn duration={400}>
              <div className="mb-12 text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Industries</span>
                <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Built for trades.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                  Every service type gets its own intake fields, scripts, and booking rules.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={120} duration={500}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {industries.map((item) => (
                  <div
                    key={item.name}
                    className="group rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4 text-center transition-all hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.example}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            FINAL CTA
        ═══════════════════════════════════════════════════════ */}
        <section className="bg-emerald-700">
          <div className="mx-auto max-w-6xl px-4 py-24 text-center">
            <FadeIn duration={400}>
              <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-[3.5rem]">
                Book more jobs without{' '}
                <span className="text-emerald-200">hiring a receptionist.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-xl text-emerald-100">
                Go live before the next business day. 78% of callers abandon a business that doesn&apos;t answer.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-13 gap-2 bg-white px-8 text-base text-emerald-800 shadow-xl shadow-emerald-900/25 hover:bg-emerald-50"
                >
                  <Link href="/register">
                    Start booking more jobs
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-13 border-emerald-400/60 bg-transparent px-8 text-base text-white hover:bg-emerald-600"
                >
                  <Link href="/contact">Schedule a demo</Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-sm text-emerald-100">
                {['Setup in 10 minutes', 'Keep your number', 'No contracts', 'Free onboarding'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
