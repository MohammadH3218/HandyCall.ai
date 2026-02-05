import Link from 'next/link';
import {
  Phone,
  Calendar,
  Users,
  CheckCircle2,
  ArrowRight,
  Shield,
  TrendingUp,
  Clock,
  MessageSquare,
  BarChart3,
  Zap,
  Lock,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/marketing/site-header';
import { Logo } from '@/components/ui/logo';

// ─── Data ────────────────────────────────────────────────────────────────────

const steps = [
  {
    icon: Phone,
    title: 'Answer',
    desc: 'HandyCall picks up every inbound call with a professional, on-brand greeting tailored to your business.',
  },
  {
    icon: Users,
    title: 'Qualify',
    desc: 'The AI captures intent, urgency, contact details, and the exact service the caller needs.',
  },
  {
    icon: Calendar,
    title: 'Book',
    desc: 'An appointment is proposed using your live availability, confirmed via SMS, and logged automatically.',
  },
];

const features = [
  {
    icon: Phone,
    title: 'Always-on call handling',
    desc: 'Answer calls 24 / 7 — during business hours, after hours, and on weekends. No call goes unanswered.',
  },
  {
    icon: Users,
    title: 'Automatic lead capture',
    desc: 'Caller identity, intent, and urgency are captured and stored in your dashboard without lifting a finger.',
  },
  {
    icon: Calendar,
    title: 'Real-time booking',
    desc: 'Appointments are scheduled against your actual availability and confirmed instantly via SMS.',
  },
  {
    icon: MessageSquare,
    title: 'Call summaries',
    desc: 'Every call gets an AI-generated summary with key details, action items, and recommended next steps.',
  },
  {
    icon: Zap,
    title: 'Automated follow-ups',
    desc: 'Send booking confirmations, reminders, and follow-up messages — configured once, runs forever.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & reporting',
    desc: 'Track call volume, lead conversion, booking rates, and revenue impact from a single dashboard.',
  },
];

const testimonials = [
  {
    quote:
      'Before HandyCall, we missed about 30 percent of calls after hours. Now every call gets answered and we have seen a real uptick in new bookings.',
    name: 'Marcus Reed',
    role: 'Owner',
    company: 'Reed Pest Solutions',
  },
  {
    quote:
      'The booking flow is seamless. Our no-show rate dropped significantly, and the call summaries save our office manager hours each week.',
    name: 'Sarah Chen',
    role: 'Operations Director',
    company: 'Chen HVAC & Cooling',
  },
  {
    quote:
      'Setup took less than an hour. The lead capture alone has paid for itself. Every caller gets qualified before we even hear about them.',
    name: 'James Whitfield',
    role: 'Owner',
    company: 'Whitfield Plumbing',
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 pt-20">
        <div className="mx-auto max-w-6xl">
          {/* status badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-sm font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Now available for service businesses
          </div>

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            {/* left – headline + CTAs */}
            <div>
              <h1 className="text-5xl font-display font-semibold leading-[1.07] tracking-[-0.025em] text-slate-900 md:text-[60px]">
                Your phone line
                <br className="hidden sm:block" />
                that closes jobs
                <br className="hidden sm:block" />
                while you work.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-slate-500 leading-relaxed">
                HandyCall answers every inbound call, qualifies the lead, and books the appointment — all before the
                caller hangs up.
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

            {/* right – product UI mockup */}
            <div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-[0_8px_40px_-8px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* window chrome */}
                <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="ml-auto text-xs text-slate-400">handycall.org / dashboard</span>
                </div>

                <div className="space-y-4 p-5">
                  {/* active-call header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-semibold text-slate-900">Active Call</span>
                      <span className="text-xs text-slate-400">0:42</span>
                    </div>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                      Live
                    </span>
                  </div>

                  {/* caller card */}
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                      <Phone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">(555) 891-2345</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">Pest Control</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-xs font-medium text-amber-600">High priority</span>
                      </div>
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">HandyCall</p>
                    <p className="text-sm leading-snug text-slate-700">
                      "We can help with termite treatment. Let me check availability and get you booked in."
                    </p>
                  </div>

                  {/* outcome chips */}
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

                  {/* today's mini-stats */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">12</p>
                      <p className="text-xs text-slate-400">Calls</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">8</p>
                      <p className="text-xs text-slate-400">Leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-emerald-600">3</p>
                      <p className="text-xs text-slate-400">Booked</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics strip ─────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              { value: '500+', label: 'Service businesses' },
              { value: '12K+', label: 'Calls handled monthly' },
              { value: '99.9%', label: 'Uptime' },
              { value: '<2 s', label: 'Avg. response time' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-display font-semibold text-slate-900">{stat.value}</p>
                <p className="mt-0.5 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">How it works</p>
            <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.015em] text-slate-900 md:text-[42px]">
              Three steps to full coverage
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">
              From the first ring to a confirmed appointment — every step is automated and logged.
            </p>
          </div>

          <div className="relative">
            {/* connector line – sits behind the circles */}
            <div className="absolute left-1/6 right-1/6 top-10 hidden h-px bg-slate-200 md:block" />

            <div className="grid gap-12 md:grid-cols-3">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex flex-col items-center text-center">
                    <div className="relative z-10">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                        <Icon className="h-7 w-7 text-emerald-600" />
                      </div>
                      {/* step number */}
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">What is included</p>
            <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.015em] text-slate-900 md:text-[42px]">
              Everything your phone line needs
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-emerald-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ROI ───────────────────────────────────────────────────────────── */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">The impact</p>
            <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.015em] text-slate-900 md:text-[42px]">
              Real results for service teams
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { number: '3+', unit: 'hrs', label: 'saved per week on call handling', icon: Clock },
              { number: '100', unit: '%', label: 'of inbound calls answered immediately', icon: Phone },
              { number: '40', unit: '%', label: 'more leads captured vs. voicemail', icon: TrendingUp },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <div className="flex items-center justify-center">
                    <Icon className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-display font-bold text-slate-900">{item.number}</span>
                    <span className="text-xl font-semibold text-emerald-600">{item.unit}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">What people say</p>
            <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.015em] text-slate-900 md:text-[42px]">
              Trusted by service teams
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t.role} · {t.company}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { icon: Shield, label: 'Enterprise-grade encryption' },
              { icon: Lock, label: 'SOC 2 Type II compliant' },
              { icon: Clock, label: '99.9 % uptime guarantee' },
              { icon: CheckCircle2, label: 'HIPAA-ready infrastructure' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Industries ────────────────────────────────────────────────────── */}
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

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-slate-900 px-8 py-20 text-center">
            <h2 className="text-3xl font-display font-semibold tracking-[-0.015em] text-white md:text-4xl">
              Ready to answer every call?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-slate-400">
              Get HandyCall running in minutes. No scripting, no flowcharts — just set up and go.
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

      {/* ── Footer ────────────────────────────────────────────────────────── */}
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
