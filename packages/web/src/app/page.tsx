import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/marketing/site-header';
import { Logo } from '@/components/ui/logo';
import { CheckCircle2, Phone } from 'lucide-react';

const flow = [
  {
    emoji: '📞',
    title: 'Answer with context',
    desc: 'HandyCall greets every caller with your tone, hours, and service prompts already loaded.',
  },
  {
    emoji: '🧭',
    title: 'Qualify with precision',
    desc: 'The AI captures intent, urgency, and contact details so you know exactly what to dispatch.',
  },
  {
    emoji: '🗓️',
    title: 'Book and confirm',
    desc: 'Appointments are proposed from live availability, confirmed via SMS, and logged automatically.',
  },
];

const controls = [
  {
    emoji: '🕒',
    title: 'Call handling rules',
    desc: 'Set business hours, overflow rules, and after-hours behavior without scripting a flowchart.',
  },
  {
    emoji: '📚',
    title: 'Service knowledge',
    desc: 'Add policies, pricing hints, and service FAQs so the AI can answer real questions.',
  },
  {
    emoji: '🔔',
    title: 'Follow-up automation',
    desc: 'Send booking links, reminders, and confirmations automatically once a lead is captured.',
  },
];

const benchmarks = [
  {
    value: '99.9%',
    label: 'Uptime target',
    detail: 'Monitored across voice services',
  },
  {
    value: '<2s',
    label: 'Avg response (testing)',
    detail: 'Internal call routing tests',
  },
  {
    value: 'Flexible',
    label: 'Customizable scripts',
    detail: 'Greeting, FAQs, routing, and handoff',
  },
  {
    value: 'Auditable',
    label: 'Conversation logs',
    detail: 'Summaries and transcripts on every call',
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
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-foreground">
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pb-24 pt-10">
        <section className="relative overflow-hidden rounded-[32px] border border-emerald-100 bg-white/70 p-8 shadow-xl shadow-emerald-100 md:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-emerald-50 blur-2xl" />
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Badge className="bg-emerald-100 text-emerald-700">AI receptionist for service businesses</Badge>
              <h1 className="text-4xl font-display leading-tight text-slate-900 md:text-6xl">
                Your phone line that closes jobs while you work.
              </h1>
              <p className="text-lg text-slate-600">
                HandyCall answers every call, captures the right details, and locks in appointments using your
                availability. You stay focused on the field while the line stays open.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/register">Launch HandyCall</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-100/70 bg-white/80 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Coverage</p>
                  <p className="text-sm font-semibold text-slate-900">Every call, every hour</p>
                </div>
                <div className="rounded-xl border border-emerald-100/70 bg-white/80 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tone</p>
                  <p className="text-sm font-semibold text-slate-900">On-brand, professional</p>
                </div>
                <div className="rounded-xl border border-emerald-100/70 bg-white/80 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Outcome</p>
                  <p className="text-sm font-semibold text-slate-900">Booked, confirmed, logged</p>
                </div>
              </div>
            </div>

            <Card className="border-emerald-100 bg-white/90 shadow-lg shadow-emerald-100">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-slate-900">Sample Call</span>
                    <span className="text-slate-400">Demo</span>
                  </div>
                  <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    Testing
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
                    <Phone className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">(555) 891-2345</p>
                    <p className="text-xs text-slate-500">Pest Control - Urgent request</p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3">
                  <p className="text-xs font-semibold text-emerald-700">HandyCall</p>
                  <p className="text-sm text-slate-700">
                    "We can help with termite treatment. Let me check availability and get you booked in."
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Lead captured
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
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
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benchmarks.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-emerald-100 bg-white/80 p-5 text-left shadow-sm"
            >
              <p className="text-2xl font-display font-semibold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{stat.label}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Badge className="bg-emerald-100 text-emerald-700">Call flow, simplified</Badge>
            <h2 className="text-3xl font-display text-slate-900 md:text-4xl">
              A clear path from greeting to confirmed appointment.
            </h2>
            <p className="text-slate-600">
              Everything is built around how service businesses actually answer the phone. No noise, no fluff, just
              clean steps that move the caller forward.
            </p>
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-white/80 p-6">
              <p className="text-xs uppercase tracking-wide text-slate-500">What you control</p>
              <div className="mt-3 grid gap-3">
                {controls.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-lg">
                        <span aria-hidden="true">{item.emoji}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {flow.map((step) => (
              <div key={step.title} className="rounded-2xl border border-emerald-100 bg-white/80 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-lg">
                    <span aria-hidden="true">{step.emoji}</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm text-slate-600">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-6">
              <p className="text-sm font-semibold text-emerald-900">Result</p>
              <p className="text-sm text-emerald-800/80">
                Call logs, bookings, and customer records stay in sync with your dashboard.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 text-center">
            <Badge className="mx-auto bg-emerald-100 text-emerald-700">Real results from testing</Badge>
            <h2 className="text-3xl font-display text-slate-900 md:text-4xl">Benchmarks from staging and QA runs</h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              These numbers come from internal testing, not customer marketing claims.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testingResults.map((item) => (
              <div key={item.label} className="rounded-2xl border border-emerald-100 bg-white/90 p-6 text-center">
                <p className="text-4xl font-display font-semibold text-slate-900">{item.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 text-center">
            <Badge className="mx-auto bg-emerald-100 text-emerald-700">Built for</Badge>
            <h2 className="text-3xl font-display text-slate-900 md:text-4xl">Service businesses across every trade</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {industries.map((item) => (
              <span key={item} className="rounded-full border border-emerald-100 bg-white/80 px-4 py-2 text-sm text-slate-700">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white/80 p-10 text-center shadow-lg shadow-emerald-50">
          <h3 className="text-3xl font-display text-slate-900">Ready to upgrade your phone experience?</h3>
          <p className="mt-3 text-slate-600">
            Launch in minutes and let HandyCall handle calls, bookings, and confirmations while your team stays on the job.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-100/60 bg-white/80 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <Logo width={120} height={30} />
            <span className="text-xs text-slate-400">© 2025 HandyCall. All rights reserved.</span>
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
