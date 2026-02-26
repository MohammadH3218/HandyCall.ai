import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Grow Your Service Business with HandyCall AI',
  description:
    'Never miss a customer call again. HandyCall answers calls 24/7, auto-books appointments, and sends follow-up messages — so you can focus on the work. Try free for 14 days.',
  openGraph: {
    title: 'HandyCall for Service Professionals',
    description: 'AI-powered call answering, booking automation, and customer follow-ups for local pros.',
  },
};
import {
  Phone,
  Calendar,
  MessageSquare,
  BarChart2,
  CheckCircle,
  Star,
  Users,
  Zap,
  ArrowRight,
  Shield,
  Clock,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────── */

const trustStats = [
  { value: '500+', label: 'Active Pros', icon: Users },
  { value: '4.8★', label: 'Average Rating', icon: Star },
  { value: 'Zero', label: 'Missed Calls', icon: Phone },
];

const features = [
  {
    icon: Phone,
    title: 'AI Answers Every Call',
    description:
      'Your AI receptionist picks up every call in under 2 seconds — 24/7, even on holidays. No more voicemail, no more missed revenue.',
  },
  {
    icon: Calendar,
    title: 'Auto-Books Appointments',
    description:
      'Callers choose their preferred time from your live calendar. Jobs land on your schedule automatically while you focus on the work.',
  },
  {
    icon: MessageSquare,
    title: 'Automated Follow-ups',
    description:
      'SMS reminders, confirmations, and job recaps go out automatically — keeping your customers informed and your no-show rate low.',
  },
  {
    icon: BarChart2,
    title: 'Real-Time Analytics',
    description:
      'See call volume, booking conversion rates, and lead sources at a glance. Know exactly what is growing your business.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Sign Up & Set Up',
    subtitle: '5 minutes',
    description:
      'Create your account and fill out your service profile. Tell us your service area, pricing, and availability. We handle the rest.',
    icon: Zap,
  },
  {
    number: '2',
    title: 'Forward Your Business Number',
    subtitle: 'Instant',
    description:
      'Forward your existing business number to your HandyCall line. Works with any carrier — your customers always call the same number.',
    icon: Phone,
  },
  {
    number: '3',
    title: 'Never Miss Another Lead',
    subtitle: 'Starting immediately',
    description:
      'Your AI handles every call, books jobs, sends confirmations, and delivers a daily summary straight to your inbox.',
    icon: CheckCircle,
  },
];

const plans = [
  {
    name: 'Starter',
    price: '$19.99',
    period: '/mo',
    description: 'Perfect for solo pros just getting started.',
    highlighted: false,
    features: [
      '100 AI minutes/month',
      '200 SMS messages/month',
      '250 contacts',
      'Online booking page',
      'Call transcripts',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '$39.99',
    period: '/mo',
    description: 'The most popular plan for growing businesses.',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      '300 AI minutes/month',
      '500 SMS messages/month',
      '1,000 contacts',
      'Automated follow-up sequences',
      'Advanced analytics',
      'Stripe payment collection',
      'Priority email & chat support',
    ],
  },
  {
    name: 'Max',
    price: '$99.99',
    period: '/mo',
    description: 'Built for high-volume pros and small teams.',
    highlighted: false,
    features: [
      'Unlimited AI minutes',
      '2,000 SMS messages/month',
      'Unlimited contacts',
      'Team management',
      'Invoicing & Stripe payouts',
      'API access',
      'Dedicated priority support',
    ],
  },
];

const testimonials = [
  {
    quote:
      'I booked 12 jobs in the first week. HandyCall paid for itself on day two. My only regret is not signing up sooner.',
    name: 'Mike R.',
    role: 'Plumber',
    location: 'Phoenix, AZ',
    rating: 5,
  },
  {
    quote:
      "I used to miss 6–8 calls a day while on the job. Now every single one is answered and scheduled. My revenue is up 40% in three months.",
    name: 'Sarah T.',
    role: 'HVAC Technician',
    location: 'Dallas, TX',
    rating: 5,
  },
  {
    quote:
      'The automated follow-ups alone are worth the price. Customers get reminders, I get paid on time, and I barely touch my phone during the day.',
    name: 'Carlos M.',
    role: 'Electrician',
    location: 'Miami, FL',
    rating: 5,
  },
];

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

export default function ProsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader variant="pro" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50 pb-28 pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent)]" />
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-slate-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <FadeIn>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
              <Zap className="h-3.5 w-3.5" />
              AI-powered call answering for service pros
            </div>
            <h1 className="mt-4 text-5xl font-extrabold leading-[1.06] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Turn missed calls into{' '}
              <span className="text-emerald-600">booked jobs.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600 leading-relaxed">
              HandyCall&rsquo;s AI answers every call, books appointments, and keeps your
              calendar full &mdash; even when you&rsquo;re on the job.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="h-12 gap-2 rounded-xl px-8 text-base font-semibold shadow-md shadow-emerald-200">
                <Link href="/register">
                  Start Free 14-Day Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 gap-2 rounded-xl px-8 text-base font-semibold">
                <Link href="/pros#how-it-works">
                  See how it works
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">No credit card required &middot; Cancel anytime</p>
          </FadeIn>
        </div>
      </section>

      {/* ── Trust Strip ──────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-white py-6">
        <div className="mx-auto max-w-4xl px-4">
          <FadeIn direction="none">
            <div className="flex flex-wrap items-center justify-center gap-10">
              {trustStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                      <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-lg font-extrabold text-slate-900 leading-none">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Features
              </span>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Everything you need to grow your business
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                HandyCall handles the front desk so you can stay focused on the work.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <FadeIn key={feature.title} delay={i * 80}>
                  <div className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 transition group-hover:bg-emerald-100">
                      <Icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                How It Works
              </span>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Up and running in minutes
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                No technical setup required. If you can forward a call, you can use HandyCall.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeIn key={step.title} delay={i * 100}>
                  <div className="relative flex flex-col items-center text-center">
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                      <div className="absolute left-[calc(50%+3rem)] top-7 hidden h-0.5 w-[calc(100%-6rem)] bg-emerald-100 sm:block" />
                    )}
                    <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        STEP {step.number}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" /> {step.subtitle}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-xs">
                      {step.description}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ───────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Pricing
              </span>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
                Start free for 14 days. No credit card required. Upgrade or cancel anytime.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-3">
            {plans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 80}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-7 shadow-sm transition ${
                    plan.highlighted
                      ? 'border-emerald-400 bg-emerald-600 text-white shadow-xl shadow-emerald-200'
                      : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900 shadow">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-1 text-sm font-semibold">
                    <span className={plan.highlighted ? 'text-emerald-100' : 'text-slate-500'}>
                      {plan.name}
                    </span>
                  </div>
                  <div className="mb-1 flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`mb-1.5 text-sm ${plan.highlighted ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`mb-6 text-sm ${plan.highlighted ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {plan.description}
                  </p>

                  <ul className="mb-8 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-emerald-200' : 'text-emerald-500'}`}
                        />
                        <span className={plan.highlighted ? 'text-emerald-50' : 'text-slate-600'}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`w-full rounded-xl font-semibold ${
                      plan.highlighted
                        ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                        : ''
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    <Link href="/register">Start Free Trial</Link>
                  </Button>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <div className="mt-8 text-center">
              <Link
                href="/pros/pricing"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View full pricing details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-14 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Social Proof
              </span>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Pros who never miss a call
              </h2>
            </div>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 80}>
                <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.role} &middot; {t.location}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="bg-emerald-600 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeIn>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold text-white">
              <Shield className="h-3.5 w-3.5" />
              No credit card &middot; No contracts &middot; Cancel anytime
            </div>
            <h2 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">
              Ready to grow your business?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-xl text-emerald-100">
              Join 500+ service pros who rely on HandyCall to answer every call,
              fill every slot, and never miss a lead.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-13 gap-2 rounded-xl bg-white px-10 text-base font-bold text-emerald-700 hover:bg-emerald-50 shadow-xl"
              >
                <Link href="/register">
                  Start Free 14-Day Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-13 gap-2 rounded-xl px-8 text-base font-semibold text-white hover:bg-white/10"
              >
                <Link href="/pros/pricing">View Pricing</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
