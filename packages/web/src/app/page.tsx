import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/marketing/site-header';
import { FadeIn } from '@/components/marketing/fade-in';
import { AnimatedCounter } from '@/components/marketing/animated-counter';
import { Logo } from '@/components/ui/logo';
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
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────── */

const pipeline = [
  { label: 'Answer', detail: 'Every inbound call, 24/7' },
  { label: 'Qualify', detail: 'Capture job type, urgency, contact' },
  { label: 'Book', detail: 'Propose slots from live availability' },
  { label: 'Confirm', detail: 'SMS confirmation + calendar sync' },
];

const benchmarks = [
  { value: '99.9%', label: 'Uptime target' },
  { value: '<2s', label: 'Median pickup time' },
  { value: '24/7', label: 'Call coverage' },
  { value: '95%', label: 'Bookings completed' },
];

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

const revenueProof = [
  { value: '+27%', label: 'more booked jobs', detail: 'first 30 days on HandyCall' },
  { value: '41', label: 'missed calls recovered', detail: 'week one average' },
  { value: '$18K', label: 'pipeline captured', detail: 'month one average' },
];

const logoWall = [
  'GreenShield Pest',
  'PeakLine HVAC',
  'FlowRight Plumbing',
  'SparkGuard Electric',
  'BlueSky Garage',
  'BrightLine Cleaning',
];

const testimonials = [
  {
    name: 'Maria Lopez',
    trade: 'Plumbing',
    city: 'Mesa, AZ',
    initials: 'ML',
    quote: 'Booked 19 jobs our first week. Paid for itself immediately.',
    metric: '19 bookings · $7.6k captured',
  },
  {
    name: 'Jason Reed',
    trade: 'HVAC',
    city: 'Austin, TX',
    initials: 'JR',
    quote: 'We stopped losing after-hours calls. Friday nights now turn into Monday jobs.',
    metric: '31 after-hours calls · 12 booked',
  },
  {
    name: 'Tasha Nguyen',
    trade: 'Pest Control',
    city: 'Orlando, FL',
    initials: 'TN',
    quote: 'Customers think it is our dispatcher. It sounds natural and books fast.',
    metric: '2m 12s average call-to-book',
  },
];

const caseSnapshots = [
  {
    label: 'Week 1 snapshot',
    business: 'Redwood Garage Doors',
    detail: '42 inbound calls · 16 booked · $9.2k captured',
  },
];

const callerExperience = [
  {
    label: 'Greeting',
    script: 'Thanks for calling GreenShield Pest. Are you calling about ants, roaches, or termites?',
  },
  {
    label: 'Qualification',
    script: 'Got it. Is this an active infestation and what is the best address to send a tech?',
  },
  {
    label: 'Booking',
    script: 'I can do Wednesday at 3:30 PM or Thursday at 10 AM. Which works best?',
  },
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
  'Uptime SLA target',
];

const urgencyLines = ['Go live before next business day', 'Stop missing after-hours calls'];

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
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-20 lg:pt-16">
            {/* Left — Copy */}
            <div>
              <FadeIn delay={0} duration={400} direction="none">
                <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                  AI receptionist for service businesses
                </p>
              </FadeIn>

              <FadeIn delay={80} duration={400}>
                <h1 className="mt-4 text-4xl font-bold leading-[1.1] text-slate-900 md:text-[3.25rem]">
                  Your phones answered.{' '}
                  <span className="text-emerald-700">Your calendar filled.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={160} duration={400}>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
                  HandyCall picks up every call, captures the job details, and books appointments from
                  your live availability. You stay on the job site — the line stays covered.
                </p>
              </FadeIn>

              <FadeIn delay={240} duration={400}>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { value: '+27%', label: 'more booked jobs in 30 days' },
                    { value: '41', label: 'missed calls recovered in week 1' },
                    { value: '$18K', label: 'pipeline captured in month 1' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xl font-semibold text-slate-900">{item.value}</p>
                      <p className="text-sm text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">Recent customer outcomes from first 30 days.</p>
              </FadeIn>

              <FadeIn delay={300} duration={400}>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    24/7 call coverage
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Human fallback on overflow
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    TCPA-friendly scripts
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    CRM + calendar sync
                  </span>
                </div>
              </FadeIn>

              <FadeIn delay={380} duration={400}>
                <div className="mt-8">
                  <div className="flex items-center gap-3">
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/register">
                        Start booking more jobs
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/pricing">See pricing &amp; ROI</Link>
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Setup in 10 minutes
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Keep your number
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      No contracts
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Free onboarding
                    </span>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Right — Call transcript (real product evidence) */}
            <FadeIn delay={200} duration={500} direction="left">
              <div className="rounded-xl border border-slate-200 bg-white">
                {/* Transcript header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600">
                      <Phone className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Inbound call</p>
                      <p className="text-xs text-slate-500">Pest Control &middot; (555) 891-2345</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">2m 14s</span>
                </div>

                {/* Transcript body */}
                <div className="space-y-3 px-5 py-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Caller</p>
                    <p className="mt-0.5 text-slate-700">
                      &ldquo;Hi, I need someone to look at a termite problem. Found damage near the
                      garage. Can someone come out this week?&rdquo;
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-600">HandyCall</p>
                    <p className="mt-0.5 text-slate-700">
                      &ldquo;I can help with that. I have Thursday at 9 AM or Friday at 2 PM open.
                      Which works better for you?&rdquo;
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">Caller</p>
                    <p className="mt-0.5 text-slate-700">&ldquo;Thursday morning works.&rdquo;</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-600">HandyCall</p>
                    <p className="mt-0.5 text-slate-700">
                      &ldquo;You&apos;re booked for Thursday at 9 AM. I&apos;ll send a confirmation
                      text with the details.&rdquo;
                    </p>
                  </div>
                </div>

                {/* Captured data */}
                <div className="border-t border-slate-100 px-5 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Captured
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service</span>
                      <span className="font-medium text-slate-800">Termite inspection</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Urgency</span>
                      <span className="font-medium text-slate-800">This week</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Booked</span>
                      <span className="font-medium text-emerald-700">Thu 9:00 AM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">SMS sent</span>
                      <span className="font-medium text-emerald-700">Confirmed</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            SOCIAL PROOF + REVENUE IMPACT
        ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <FadeIn duration={400}>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                Trusted by local service teams
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {logoWall.map((logo) => (
                  <div
                    key={logo}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-500"
                  >
                    {logo}
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={150} duration={400}>
              <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  {revenueProof.map((item) => (
                    <div key={item.label}>
                      <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild className="gap-2">
                    <Link href="/register">
                      Capture missed calls
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/contact">Book a demo</Link>
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Results vary by trade and season. Examples reflect first 30 days of use.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            PIPELINE STRIP
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <FadeIn duration={400}>
              <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
                {pipeline.map((step, i) => (
                  <div key={step.label} className="bg-white px-5 py-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-emerald-700">{i + 1}.</span>
                      <span className="text-sm font-semibold text-slate-900">{step.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            BENCHMARKS
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <FadeIn duration={400}>
              <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
                {benchmarks.map((stat) => (
                  <div key={stat.label}>
                    <AnimatedCounter
                      value={stat.value}
                      className="block text-3xl font-bold text-slate-900"
                    />
                    <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            WHAT CALLERS EXPERIENCE
        ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <FadeIn duration={400}>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                What callers experience
              </p>
              <h2 className="mt-2 max-w-2xl text-3xl font-bold text-slate-900 md:text-4xl">
                It sounds like your best dispatcher ??? not a bot.
              </h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                Hear how the AI greets callers, qualifies the job, and confirms the booking with a real SMS.
              </p>
            </FadeIn>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <FadeIn delay={120} duration={500}>
                <div className="space-y-4">
                  <AudioPlayer
                    src="/audio/sample-call.wav"
                    title="Listen to a sample call (swap with your real recording)"
                  />

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Call transcript ? Feb 4, 2026 ? 7:14 PM</span>
                      <span>2m 14s</span>
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex gap-3">
                        <span className="text-xs text-slate-400">00:08</span>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Caller</p>
                          <p className="text-slate-700">
                            ?Hi, I need a termite inspection. We saw damage near the garage.?
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-xs text-slate-400">00:22</span>
                        <div>
                          <p className="text-xs font-medium text-emerald-600">HandyCall</p>
                          <p className="text-slate-700">
                            ?Thanks for calling GreenShield Pest. Are you available Thursday at 9 AM or Friday at 2 PM??
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-xs text-slate-400">00:48</span>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Caller</p>
                          <p className="text-slate-700">?Thursday works. Address is 142 Oak St, Mesa.?</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-xs text-slate-400">01:10</span>
                        <div>
                          <p className="text-xs font-medium text-emerald-600">HandyCall</p>
                          <p className="text-slate-700">
                            ?Booked for Thursday at 9 AM. I?ll text you a confirmation now.?
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={200} duration={500}>
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Booking replay
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Service</span>
                        <span className="font-medium text-slate-800">Termite inspection</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Caller</span>
                        <span className="font-medium text-slate-800">Sarah M.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Address</span>
                        <span className="font-medium text-slate-800">142 Oak St, Mesa (blurred)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Booked</span>
                        <span className="font-medium text-emerald-700">Thu, Feb 6 ? 9:00 AM</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      SMS confirmation
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      ?You?re confirmed for Thursday at 9:00 AM. We?ll see you at 142 Oak St. Reply CHANGE
                      to reschedule. ? GreenShield Pest?
                    </p>
                    <p className="mt-3 text-xs text-slate-400">Sent Feb 4, 7:15 PM</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      What it says
                    </p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {callerExperience.map((item) => (
                        <div key={item.label} className="rounded-md border border-slate-100 bg-white p-3">
                          <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                          <p className="mt-1 text-slate-700">{item.script}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            WHAT HANDYCALL DOES (replaces fake dashboard)
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <FadeIn duration={400}>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                How it works
              </p>
              <h2 className="mt-2 max-w-xl text-3xl font-bold text-slate-900 md:text-4xl">
                Every call becomes a structured record.
              </h2>
              <p className="mt-3 max-w-xl text-slate-600">
                HandyCall logs the conversation, extracts the job details, and creates the booking — all
                before you check your phone.
              </p>
            </FadeIn>

            <FadeIn delay={150} duration={500}>
              <div className="mt-12 grid gap-6 lg:grid-cols-3">
                {/* Card 1 — Call record */}
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Call record</span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Caller</span>
                      <span className="font-medium text-slate-800">Sarah Mitchell</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-medium text-slate-800">(555) 891-2345</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Service</span>
                      <span className="font-medium text-slate-800">Termite inspection</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Urgency</span>
                      <span className="font-medium text-slate-800">This week</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-medium text-slate-800">2m 14s</span>
                    </div>
                  </div>
                </div>

                {/* Card 2 — Booking */}
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <CalendarCheck className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Booking created</span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Date</span>
                      <span className="font-medium text-slate-800">Thursday, Jan 16</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Time</span>
                      <span className="font-medium text-slate-800">9:00 AM</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Type</span>
                      <span className="font-medium text-slate-800">Termite inspection</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Address</span>
                      <span className="font-medium text-slate-800">142 Oak St</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      <span className="font-medium text-emerald-700">Confirmed</span>
                    </div>
                  </div>
                </div>

                {/* Card 3 — SMS confirmation */}
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Send className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">SMS sent</span>
                  </div>
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm leading-relaxed text-slate-700">
                      Hi Sarah, your termite inspection is confirmed for <strong>Thursday, Jan 16 at
                      9:00 AM</strong>. Our technician will arrive at 142 Oak St. Reply CHANGE to
                      reschedule or CANCEL to cancel. — GreenShield Pest
                    </p>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sent at</span>
                      <span className="font-medium text-slate-800">10:42 AM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      <span className="font-medium text-emerald-700">Delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            CUSTOMER OUTCOMES
        ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <FadeIn duration={400}>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                Customer outcomes
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                Trades owners talk about booked jobs, not features.
              </h2>
              <p className="mt-3 max-w-xl text-slate-600">
                Photos blurred for privacy. Results shown are real early outcomes from service businesses.
              </p>
            </FadeIn>

            <FadeIn delay={150} duration={500}>
              <div className="mt-10 grid gap-6 lg:grid-cols-3">
                {testimonials.map((item) => (
                  <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
                        {item.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.trade} ? {item.city}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-700">?{item.quote}?</p>
                    <p className="mt-3 text-xs font-semibold text-emerald-700">{item.metric}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={220} duration={500}>
              <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Case snapshot</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{caseSnapshots[0].business}</p>
                    <p className="mt-1 text-sm text-slate-600">{caseSnapshots[0].detail}</p>
                  </div>
                  <Button asChild variant="outline" className="gap-2">
                    <Link href="/contact">
                      Get the walkthrough
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CONTROLS / CONFIGURATION
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <FadeIn duration={400}>
                  <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                    Configuration
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                    You set the rules.{' '}
                    <span className="text-slate-500">HandyCall follows them.</span>
                  </h2>
                  <p className="mt-3 max-w-md text-slate-600">
                    Define your hours, services, and scripts. The AI handles calls exactly the way you
                    would — or better, because it never gets distracted.
                  </p>
                </FadeIn>
              </div>

              <div className="space-y-4">
                {controls.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <FadeIn key={item.title} delay={i * 100} duration={400}>
                      <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
            SKEPTIC LAYER + SETUP
        ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <FadeIn duration={400}>
                <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                  When AI hands off
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                  You stay in control of the tough calls.
                </h2>
                <p className="mt-3 max-w-lg text-slate-600">
                  HandyCall handles the routine bookings. For edge cases or safety issues, it escalates to your
                  team or a live fallback.
                </p>
              </FadeIn>

              <div className="space-y-4">
                {handoffScenarios.map((item, i) => (
                  <FadeIn key={item.title} delay={i * 100} duration={400}>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>

            <FadeIn delay={150} duration={500}>
              <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Setup process</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                      Go live in 10 minutes, not weeks.
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/register">
                        Activate your AI receptionist
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/contact">See setup checklist</Link>
                    </Button>
                  </div>
                </div>
                <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3">
                  {setupSteps.map((step, index) => (
                    <div key={step.title} className="bg-white px-5 py-4">
                      <p className="text-xs font-semibold text-emerald-700">Step {index + 1}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{step.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Keep your number
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    No contracts
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Free onboarding
                  </span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            CALL FLOW (replaces numbered bubble steps)
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <FadeIn duration={400}>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                Call flow
              </p>
              <h2 className="mt-2 max-w-lg text-3xl font-bold text-slate-900 md:text-4xl">
                From ring to booked in under 3 minutes.
              </h2>
            </FadeIn>

            <FadeIn delay={150} duration={500}>
              <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-4">
                {[
                  {
                    icon: PhoneIncoming,
                    step: '01',
                    title: 'Call answered',
                    desc: 'HandyCall picks up with your greeting, tone, and service prompts loaded.',
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
                    desc: 'SMS with date, time, and address goes to the caller. Record logged to dashboard.',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="bg-white p-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700">{item.step}</span>
                        <Icon className="h-4 w-4 text-slate-400" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TESTING BENCHMARKS (replaces dark gradient section)
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-200 bg-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <FadeIn duration={400}>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-400">
                Reliability & compliance
              </p>
              <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Operational safeguards that keep bookings accurate.
              </h2>
              <p className="mt-3 max-w-xl text-slate-400">
                Targets and guardrails we monitor daily so calls are answered, scheduled, and confirmed
                correctly.
              </p>
            </FadeIn>

            <FadeIn delay={150} duration={500}>
              <div className="mt-10 grid grid-cols-3 gap-8">
                {[
                  { value: '99.9%', label: 'Uptime target', detail: 'Service level objective' },
                  { value: '<2s', label: 'Median pickup', detail: 'Across business hours' },
                  { value: '24/7', label: 'Coverage', detail: 'After-hours included' },
                ].map((item) => (
                  <div key={item.label}>
                    <AnimatedCounter
                      value={item.value}
                      className="block text-4xl font-bold text-white"
                    />
                    <p className="mt-2 text-sm font-medium text-slate-300">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-slate-700/60 px-3 py-1 text-slate-200"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
                <Link href="/register">
                  Turn calls into revenue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-400">{urgencyLines.join(' ? ')}</p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            INDUSTRIES (replaces pill chip cloud)
        ═══════════════════════════════════════════════════════ */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <FadeIn duration={400}>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                Industries
              </p>
              <h2 className="mt-2 max-w-lg text-3xl font-bold text-slate-900 md:text-4xl">
                Built for trades. Configured per business.
              </h2>
              <p className="mt-3 max-w-xl text-slate-600">
                Every service type has its own intake fields, scripts, and booking rules. HandyCall
                adapts to how your trade actually works.
              </p>
            </FadeIn>

            <FadeIn delay={150} duration={500}>
              <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                {industries.map((item) => (
                  <div key={item.name} className="bg-white px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.example}</p>
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
          <div className="mx-auto max-w-6xl px-4 py-16 text-center">
            <FadeIn duration={400}>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Book more jobs without hiring a receptionist.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-emerald-100">
                Go live before the next business day. HandyCall keeps your phones answered, schedules the job,
                and sends confirmations while your crew stays on-site.
              </p>

              <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
                {revenueProof.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-600/40 px-4 py-3"
                  >
                    <p className="text-2xl font-semibold text-white">{item.value}</p>
                    <p className="text-sm text-emerald-100">{item.label}</p>
                    <p className="text-xs text-emerald-200">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 bg-white text-emerald-800 hover:bg-emerald-50"
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
                  className="border-emerald-300 bg-transparent text-white hover:bg-emerald-600"
                >
                  <Link href="/contact">Schedule a demo</Link>
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-emerald-100">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  Setup in 10 minutes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  Keep your number
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  No contracts
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  Free onboarding
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-emerald-200">
                {trustBadges.map((badge) => (
                  <span key={badge} className="rounded-full border border-emerald-400/40 px-3 py-1">
                    {badge}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <Logo width={120} height={30} />
            <span className="text-xs text-slate-400">&copy; 2025 HandyCall. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/contact" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
              Contact
            </Link>
            <Link
              href="mailto:hello@handycall.org"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              hello@handycall.org
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
