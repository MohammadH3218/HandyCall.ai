import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/marketing/site-header';

const flow = [
  {
    title: 'Answer with context',
    desc: 'Your callers hear a calm, on-brand greeting that adapts to each service and location.',
  },
  {
    title: 'Qualify and route',
    desc: 'The AI captures intent, urgency, and availability, then routes to the right workflow.',
  },
  {
    title: 'Book confidently',
    desc: 'Appointments are proposed using your hours, then confirmed and logged automatically.',
  },
];

const controls = [
  {
    title: 'Call handling rules',
    desc: 'Set business hours, overflow rules, and after-hours behavior without scripting a flowchart.',
  },
  {
    title: 'Service knowledge',
    desc: 'Add policies, pricing hints, and service FAQs so the AI can answer real questions.',
  },
  {
    title: 'Follow-up automation',
    desc: 'Send booking links, reminders, and confirmations automatically once a lead is captured.',
  },
];

const industries = [
  'Pest control',
  'HVAC',
  'Cleaning services',
  'Plumbing',
  'Electrical',
  'Landscaping',
  'Garage doors',
  'Property maintenance',
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
                  <span className="uppercase tracking-wide">Live call snapshot</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Active</span>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-sm font-semibold text-emerald-800">Caller</p>
                  <p className="text-sm text-slate-700">"Can you treat termites this week?"</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">HandyCall</p>
                  <p className="text-sm text-slate-700">
                    "We can help. I can send a booking link and secure a time that fits your schedule."
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Outcome</p>
                    <p className="text-sm font-semibold text-slate-900">Lead captured</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Next step</p>
                    <p className="text-sm font-semibold text-slate-900">Booking link sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {flow.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-emerald-100 bg-white/80 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
                    {index + 1}
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
            <Badge className="mx-auto bg-emerald-100 text-emerald-700">Built for busy field teams</Badge>
            <h2 className="text-3xl font-display text-slate-900 md:text-4xl">Designed for real-world service lines</h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              HandyCall works across industries that need quick answers, clear scheduling, and reliable follow-through.
            </p>
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
    </div>
  );
}
