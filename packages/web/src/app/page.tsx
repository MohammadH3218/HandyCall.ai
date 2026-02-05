import Link from 'next/link';
import { Phone, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/marketing/site-header';
import { Logo } from '@/components/ui/logo';
import { Badge } from '@/components/ui/badge';

const steps = [
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

const features = [
  {
    emoji: '☎️',
    title: 'Always-on call handling',
    desc: 'Answer calls during business hours, after hours, and weekends without missing a lead.',
  },
  {
    emoji: '🧾',
    title: 'Automatic lead capture',
    desc: 'Caller identity, intent, and urgency are captured and stored in your dashboard without lifting a finger.',
  },
  {
    emoji: '📆',
    title: 'Real-time booking',
    desc: 'Appointments are scheduled against your availability and confirmed instantly via SMS.',
  },
  {
    emoji: '📝',
    title: 'Call summaries',
    desc: 'Every call gets an AI-generated summary with key details, action items, and recommended next steps.',
  },
  {
    emoji: '⚡',
    title: 'Automated follow-ups',
    desc: 'Send confirmations, reminders, and follow-ups automatically from a single setup.',
  },
  {
    emoji: '📈',
    title: 'Analytics & reporting',
    desc: 'Track call volume, lead conversion, booking rates, and revenue impact from a single dashboard.',
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
    detail: 'Summaries + transcripts on every call',
  },
];

const testingResults = [
  {
    value: '100%',
    label: 'Calls answered in test harness',
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

const reliability = [
  {
    emoji: '🔐',
    label: 'Encrypted in transit',
  },
  {
    emoji: '🧠',
    label: 'Configurable AI prompts',
  },
  {
    emoji: '📋',
    label: 'Activity + audit logs',
  },
  {
    emoji: '🛟',
    label: 'Human handoff ready',
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

      <section className="px-4 pb-16 pt-20">
        <div className="mx-auto max-w-6xl">
          <Badge className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Now available for service businesses
          </Badge>

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div>
              <h1 className="text-5xl font-display font-semibold leading-[1.07] tracking-[-0.025em] text-slate-900 md:text-[60px]">
                Your phone line
                <br className="hidden sm:block" />
                that closes jobs
                <br className="hidden sm:block" />
                while you work.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-slate-500 leading-relaxed">
                HandyCall answers every inbound call, qualifies the lead, and books the appointment before the caller
                hangs up.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="text-base">
                  <Link href="/register">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-slate-400">No credit card required</p>
            </div>

            <div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-[0_8px_40px_-8px_rgba(0,0,0,0.1)] overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="ml-auto text-xs text-slate-400">handycall.org / demo</span>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-semibold text-slate-900">Sample Call</span>
                      <span className="text-xs text-slate-400">Demo</span>
                    </div>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                      Testing
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                      <Phone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">(555) 891-2345</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">Pest Control</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-xs font-medium text-amber-600">Urgent request</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">HandyCall</p>
                    <p className="text-sm leading-snug text-slate-700">
                      "We can help with termite treatment. Let me check availability and get you booked in."
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-xs font-medium text-slate-700">Lead captured</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-white px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      <span className="text-xs font-medium text-slate-700">Booking sent</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">--</p>
                      <p className="text-xs text-slate-400">Calls</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">--</p>
                      <p className="text-xs text-slate-400">Leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-emerald-600">--</p>
                      <p className="text-xs text-slate-400">Booked</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-100/60 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">How it works</p>
            <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.015em] text-slate-900 md:text-[42px]">
              Three steps to full coverage
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">
              From the first ring to a confirmed appointment, every step is automated and logged.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-1/6 right-1/6 top-10 hidden h-px bg-slate-200 md:block" />

            <div className="grid gap-12 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.title} className="flex flex-col items-center text-center">
                  <div className="relative z-10">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-white text-3xl shadow-sm">
                      <span aria-hidden="true">{step.emoji}</span>
                    </div>
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">What is included</p>
            <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.015em] text-slate-900 md:text-[42px]">
              Everything your phone line needs
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-emerald-200"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl">
                  <span aria-hidden="true">{feature.emoji}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">The impact</p>
            <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.015em] text-slate-900 md:text-[42px]">
              Real results from testing
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">
              Benchmarks gathered from internal staging scenarios and scripted test calls.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testingResults.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-display font-bold text-slate-900">{item.value}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {reliability.map((item) => (
              <div key={item.label} className="flex items-center justify-center gap-3">
                <span className="text-lg" aria-hidden="true">{item.emoji}</span>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">Built for</p>
          <h2 className="mt-2 text-2xl font-display font-semibold text-slate-900">
            Service businesses across every trade
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {industries.map((item) => (
              <span key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-900/90 to-slate-900 px-8 py-20 text-center">
            <h2 className="text-3xl font-display font-semibold tracking-[-0.015em] text-white md:text-4xl">
              Ready to answer every call?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-slate-300">
              Get HandyCall running in minutes. No scripting, no flowcharts - just set up and go.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="text-base bg-emerald-600 text-white shadow-none hover:bg-emerald-500 hover:shadow-none"
              >
                <Link href="/register">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-base border-slate-700 bg-transparent text-slate-300 hover:border-slate-600 hover:bg-transparent hover:text-white"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-4 py-10">
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
