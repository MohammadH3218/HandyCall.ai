import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/marketing/site-header';
import { FadeIn } from '@/components/marketing/fade-in';
import { AnimatedCounter } from '@/components/marketing/animated-counter';
import { Logo } from '@/components/ui/logo';
import {
  CheckCircle2,
  Phone,
  ArrowRight,
  Clock,
  BookOpen,
  Bell,
  PhoneIncoming,
  Target,
  CalendarCheck,
  BarChart3,
  MessageSquare,
  Shield,
} from 'lucide-react';

const flow = [
  {
    icon: PhoneIncoming,
    title: 'Answer with context',
    desc: 'HandyCall greets every caller with your tone, hours, and service prompts already loaded.',
  },
  {
    icon: Target,
    title: 'Qualify with precision',
    desc: 'The AI captures intent, urgency, and contact details so you know exactly what to dispatch.',
  },
  {
    icon: CalendarCheck,
    title: 'Book and confirm',
    desc: 'Appointments are proposed from live availability, confirmed via SMS, and logged automatically.',
  },
];

const controls = [
  {
    icon: Clock,
    title: 'Call handling rules',
    desc: 'Set business hours, overflow rules, and after-hours behavior without scripting a flowchart.',
  },
  {
    icon: BookOpen,
    title: 'Service knowledge',
    desc: 'Add policies, pricing hints, and service FAQs so the AI can answer real questions.',
  },
  {
    icon: Bell,
    title: 'Follow-up automation',
    desc: 'Send booking links, reminders, and confirmations automatically once a lead is captured.',
  },
];

const benchmarks = [
  {
    value: '99.9%',
    label: 'Uptime target',
    detail: 'Monitored across voice services',
    icon: Shield,
  },
  {
    value: '<2s',
    label: 'Avg response (testing)',
    detail: 'Internal call routing tests',
    icon: Clock,
  },
  {
    value: 'Flexible',
    label: 'Customizable scripts',
    detail: 'Greeting, FAQs, routing, and handoff',
    icon: MessageSquare,
    isText: true,
  },
  {
    value: 'Auditable',
    label: 'Conversation logs',
    detail: 'Summaries and transcripts on every call',
    icon: BarChart3,
    isText: true,
  },
];

const testingResults = [
  {
    value: '100%',
    label: 'Calls answered in testing',
    detail: 'Simulated inbound scenarios',
  },
  {
    value: '<2s',
    label: 'Median response time',
    detail: 'Internal staging benchmarks',
  },
  {
    value: '95%',
    label: 'Booking flow completion',
    detail: 'Scripted test appointments',
  },
];

const industries = [
  'Pest Control',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Landscaping',
  'Cleaning Services',
  'Garage Doors',
  'Property Maintenance',
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white text-foreground">
      {/* ── Global grid texture ── */}
      <div className="bg-grid bg-grid-fade pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto flex max-w-6xl flex-col px-4 pb-24 pt-6">
          {/* ═══════════════════════════════════════════════════════
              HERO SECTION
          ═══════════════════════════════════════════════════════ */}
          <section className="relative overflow-hidden rounded-[32px] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/20 to-white p-8 shadow-xl shadow-emerald-100/50 md:p-14">
            {/* Background orbs */}
            <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-emerald-200/30 blur-[80px]" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-emerald-100/40 blur-[60px]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-50/60 blur-[50px]" />

            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-7">
                <FadeIn delay={100} duration={500}>
                  <Badge className="bg-emerald-100/80 text-emerald-700 backdrop-blur-sm">
                    AI receptionist for service businesses
                  </Badge>
                </FadeIn>

                <FadeIn delay={200} duration={600}>
                  <h1 className="text-gradient text-4xl font-display leading-[1.1] md:text-[3.5rem]">
                    Your phone line that closes jobs while you work.
                  </h1>
                </FadeIn>

                <FadeIn delay={350} duration={600}>
                  <p className="max-w-lg text-lg leading-relaxed text-slate-600">
                    HandyCall answers every call, captures the right details, and locks in appointments using your
                    availability. You stay focused on the field while the line stays open.
                  </p>
                </FadeIn>

                <FadeIn delay={500} duration={500}>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg" className="group gap-2">
                      <Link href="/register">
                        Launch HandyCall
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/pricing">View pricing</Link>
                    </Button>
                  </div>
                </FadeIn>

                <FadeIn delay={650} duration={500}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Coverage', value: 'Every call, every hour' },
                      { label: 'Tone', value: 'On-brand, professional' },
                      { label: 'Outcome', value: 'Booked, confirmed, logged' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-emerald-100/60 bg-white/60 p-3 backdrop-blur-sm transition-colors hover:bg-white/80"
                      >
                        <p className="text-[11px] uppercase tracking-wider text-slate-400">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </FadeIn>
              </div>

              {/* ── Hero demo card ── */}
              <FadeIn delay={400} duration={700} direction="left">
                <div className="animate-subtle-float">
                  <Card className="border-emerald-100/80 bg-white/95 shadow-xl shadow-emerald-100/40 backdrop-blur-sm glow-emerald">
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          <span className="font-semibold text-slate-900">Sample Call</span>
                          <span className="text-slate-400">Demo</span>
                        </div>
                        <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                          Testing
                        </span>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                          <Phone className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">(555) 891-2345</p>
                          <p className="text-xs text-slate-500">Pest Control &middot; Urgent request</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-emerald-50/40 p-3">
                        <p className="text-xs font-semibold text-emerald-700">HandyCall</p>
                        <p className="text-sm text-slate-700">
                          &ldquo;We can help with termite treatment. Let me check availability and get you booked
                          in.&rdquo;
                        </p>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Lead captured
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Booking sent
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3 text-center text-xs">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">-</p>
                          <p className="text-slate-400">Calls</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">-</p>
                          <p className="text-slate-400">Leads</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-600">-</p>
                          <p className="text-slate-400">Booked</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </FadeIn>
            </div>
          </section>

          {/* ── Spacer with connecting line ── */}
          <div className="mx-auto flex h-20 flex-col items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-emerald-200/0 via-emerald-200/60 to-emerald-200/0" />
          </div>

          {/* ═══════════════════════════════════════════════════════
              BENCHMARKS BAR
          ═══════════════════════════════════════════════════════ */}
          <FadeIn>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {benchmarks.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <FadeIn key={stat.label} delay={i * 100} duration={500}>
                    <div className="group rounded-2xl border border-emerald-100/70 bg-white/70 p-5 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-emerald-200/80 hover:bg-white hover:shadow-md">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                        <Icon className="h-4 w-4" />
                      </div>
                      {stat.isText ? (
                        <p className="text-2xl font-display font-semibold text-slate-900">{stat.value}</p>
                      ) : (
                        <AnimatedCounter
                          value={stat.value}
                          className="block text-2xl font-display font-semibold text-slate-900"
                        />
                      )}
                      <p className="mt-1 text-sm font-semibold text-slate-700">{stat.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </section>
          </FadeIn>

          {/* ── Spacer ── */}
          <div className="mx-auto flex h-24 flex-col items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-emerald-200/0 via-emerald-200/60 to-emerald-200/0" />
          </div>

          {/* ═══════════════════════════════════════════════════════
              DASHBOARD PREVIEW
          ═══════════════════════════════════════════════════════ */}
          <FadeIn>
            <section className="space-y-8">
              <div className="text-center">
                <Badge className="bg-emerald-100/80 text-emerald-700">Product preview</Badge>
                <h2 className="mt-3 text-3xl font-display text-slate-900 md:text-4xl">
                  Everything lands in one dashboard.
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-slate-600">
                  Calls, leads, bookings, and transcripts — organized and ready when you need them.
                </p>
              </div>

              {/* Browser chrome mockup */}
              <FadeIn delay={200} duration={700}>
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/50">
                  {/* Browser bar */}
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-slate-200" />
                      <div className="h-3 w-3 rounded-full bg-slate-200" />
                      <div className="h-3 w-3 rounded-full bg-slate-200" />
                    </div>
                    <div className="ml-3 flex-1 rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-400">
                      app.handycall.org/dashboard
                    </div>
                  </div>

                  {/* Dashboard content */}
                  <div className="p-6 md:p-8">
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Stat cards */}
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Today&apos;s calls</p>
                        <p className="mt-1 text-3xl font-display font-semibold text-slate-900">12</p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                          <ArrowRight className="h-3 w-3 rotate-[-45deg]" />
                          <span>+3 from yesterday</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Leads captured</p>
                        <p className="mt-1 text-3xl font-display font-semibold text-slate-900">8</p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                          <ArrowRight className="h-3 w-3 rotate-[-45deg]" />
                          <span>67% conversion</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Booked</p>
                        <p className="mt-1 text-3xl font-display font-semibold text-emerald-600">5</p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>All confirmed</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent calls list */}
                    <div className="mt-6 rounded-xl border border-slate-100 bg-white">
                      <div className="border-b border-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">Recent calls</p>
                      </div>
                      {[
                        {
                          name: 'Sarah M.',
                          service: 'Termite inspection',
                          time: '2m ago',
                          status: 'Booked',
                          statusColor: 'bg-emerald-50 text-emerald-700',
                        },
                        {
                          name: 'James R.',
                          service: 'HVAC maintenance',
                          time: '18m ago',
                          status: 'Lead',
                          statusColor: 'bg-amber-50 text-amber-700',
                        },
                        {
                          name: 'David K.',
                          service: 'Emergency plumbing',
                          time: '1h ago',
                          status: 'Booked',
                          statusColor: 'bg-emerald-50 text-emerald-700',
                        },
                      ].map((call, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between border-b border-slate-50 px-4 py-3 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                              {call.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{call.name}</p>
                              <p className="text-xs text-slate-400">{call.service}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">{call.time}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${call.statusColor}`}
                            >
                              {call.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            </section>
          </FadeIn>

          {/* ── Spacer ── */}
          <div className="mx-auto flex h-24 flex-col items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-emerald-200/0 via-emerald-200/60 to-emerald-200/0" />
          </div>

          {/* ═══════════════════════════════════════════════════════
              CALL FLOW + CONTROLS
          ═══════════════════════════════════════════════════════ */}
          <section className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <FadeIn>
                <Badge className="bg-emerald-100/80 text-emerald-700">Call flow, simplified</Badge>
              </FadeIn>
              <FadeIn delay={100}>
                <h2 className="text-3xl font-display text-slate-900 md:text-4xl">
                  A clear path from greeting to confirmed appointment.
                </h2>
              </FadeIn>
              <FadeIn delay={200}>
                <p className="text-slate-600">
                  Everything is built around how service businesses actually answer the phone. No noise, no fluff, just
                  clean steps that move the caller forward.
                </p>
              </FadeIn>

              <FadeIn delay={300}>
                <div className="mt-6 rounded-2xl border border-emerald-100/70 bg-white/60 p-6 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">What you control</p>
                  <div className="mt-3 grid gap-3">
                    {controls.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <FadeIn key={item.title} delay={400 + i * 100}>
                          <div className="group rounded-xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:border-emerald-100 hover:shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                              </div>
                            </div>
                          </div>
                        </FadeIn>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            </div>

            <div className="space-y-4">
              {flow.map((step, i) => {
                const Icon = step.icon;
                return (
                  <FadeIn key={step.title} delay={i * 150} direction="left">
                    <div className="group relative rounded-2xl border border-emerald-100/70 bg-white/60 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-md">
                      {/* Step number */}
                      <div className="absolute -left-3 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-sm">
                        {i + 1}
                      </div>
                      <div className="flex items-start gap-4 pl-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{step.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                      {/* Connecting line between steps */}
                      {i < flow.length - 1 && (
                        <div className="absolute -bottom-4 left-[-0.25rem] h-4 w-px bg-emerald-200/60" />
                      )}
                    </div>
                  </FadeIn>
                );
              })}

              <FadeIn delay={flow.length * 150}>
                <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-50/40 p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-900">Result</p>
                  </div>
                  <p className="mt-1 text-sm text-emerald-800/80">
                    Call logs, bookings, and customer records stay in sync with your dashboard.
                  </p>
                </div>
              </FadeIn>
            </div>
          </section>

          {/* ── Spacer ── */}
          <div className="mx-auto flex h-24 flex-col items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-emerald-200/0 via-emerald-200/60 to-emerald-200/0" />
          </div>

          {/* ═══════════════════════════════════════════════════════
              TESTING BENCHMARKS
          ═══════════════════════════════════════════════════════ */}
          <FadeIn>
            <section className="relative overflow-hidden rounded-[28px] border border-emerald-100/60 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-10 shadow-xl md:p-14">
              {/* Texture overlay on dark section */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-[80px]" />

              <div className="relative flex flex-col gap-3 text-center">
                <FadeIn delay={100}>
                  <Badge className="mx-auto border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    Real results from testing
                  </Badge>
                </FadeIn>
                <FadeIn delay={200}>
                  <h2 className="text-3xl font-display text-white md:text-4xl">
                    Benchmarks from staging and QA runs
                  </h2>
                </FadeIn>
                <FadeIn delay={300}>
                  <p className="mx-auto max-w-2xl text-slate-400">
                    These numbers come from internal testing, not customer marketing claims.
                  </p>
                </FadeIn>
              </div>

              <div className="relative mt-10 grid gap-6 md:grid-cols-3">
                {testingResults.map((item, i) => (
                  <FadeIn key={item.label} delay={400 + i * 150}>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 text-center backdrop-blur-sm transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.07]">
                      <AnimatedCounter
                        value={item.value}
                        className="block text-4xl font-display font-semibold text-white"
                      />
                      <p className="mt-2 text-sm font-semibold text-slate-300">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </section>
          </FadeIn>

          {/* ── Spacer ── */}
          <div className="mx-auto flex h-24 flex-col items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-emerald-200/0 via-emerald-200/60 to-emerald-200/0" />
          </div>

          {/* ═══════════════════════════════════════════════════════
              INDUSTRIES
          ═══════════════════════════════════════════════════════ */}
          <FadeIn>
            <section className="space-y-6">
              <div className="flex flex-col gap-3 text-center">
                <Badge className="mx-auto bg-emerald-100/80 text-emerald-700">Built for</Badge>
                <h2 className="text-3xl font-display text-slate-900 md:text-4xl">
                  Service businesses across every trade
                </h2>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {industries.map((item, i) => (
                  <FadeIn key={item} delay={i * 60} duration={400}>
                    <span className="inline-block rounded-full border border-emerald-100/80 bg-white/70 px-5 py-2.5 text-sm text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-emerald-200 hover:bg-white hover:shadow-md">
                      {item}
                    </span>
                  </FadeIn>
                ))}
              </div>
            </section>
          </FadeIn>

          {/* ── Spacer ── */}
          <div className="mx-auto flex h-24 flex-col items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-emerald-200/0 via-emerald-200/60 to-emerald-200/0" />
          </div>

          {/* ═══════════════════════════════════════════════════════
              FINAL CTA
          ═══════════════════════════════════════════════════════ */}
          <FadeIn>
            <section className="relative overflow-hidden rounded-[28px] border border-emerald-100/60 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/50 p-10 text-center shadow-lg shadow-emerald-50/50 md:p-14">
              <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-emerald-100/40 blur-[50px]" />
              <div className="pointer-events-none absolute -right-20 bottom-0 h-40 w-40 rounded-full bg-emerald-100/40 blur-[50px]" />

              <div className="relative">
                <h3 className="text-3xl font-display text-slate-900 md:text-4xl">
                  Ready to upgrade your phone experience?
                </h3>
                <p className="mx-auto mt-4 max-w-lg text-slate-600">
                  Launch in minutes and let HandyCall handle calls, bookings, and confirmations while your team stays on
                  the job.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button asChild size="lg" className="group gap-2">
                    <Link href="/register">
                      Get started
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/contact">Talk to us</Link>
                  </Button>
                </div>
              </div>
            </section>
          </FadeIn>
        </main>

        {/* ═══════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════ */}
        <footer className="border-t border-emerald-100/40 bg-white/80 px-4 py-8 backdrop-blur-sm">
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
    </div>
  );
}
