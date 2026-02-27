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
  IconStar,
  IconUsers,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'HandyCall — AI Receptionist for Service Professionals',
  description:
    'Never miss a customer call again. HandyCall answers calls 24/7, auto-books appointments, and sends follow-up messages — so you can focus on the work. Try free for 14 days.',
  openGraph: {
    title: 'HandyCall for Service Professionals',
    description: 'AI-powered call answering, booking automation, and customer follow-ups for local pros.',
  },
};

const features = [
  {
    icon: IconPhone,
    title: 'AI Answers Every Call',
    description:
      'Your AI receptionist picks up every call in under 2 seconds — 24/7, even on holidays. No more voicemail, no more missed revenue.',
  },
  {
    icon: IconCalendar,
    title: 'Auto-Books Appointments',
    description:
      'Callers choose their preferred time from your live calendar. Jobs land on your schedule automatically while you focus on the work.',
  },
  {
    icon: IconMessage,
    title: 'Automated Follow-ups',
    description:
      'SMS reminders, confirmations, and job recaps go out automatically — keeping your customers informed and your no-show rate low.',
  },
  {
    icon: IconChartBar,
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
      'Create your account and fill out your service profile. Tell us your service area, pricing, and availability.',
  },
  {
    number: '2',
    title: 'Forward Your Business Number',
    subtitle: 'Instant',
    description:
      'Forward your existing business number to your HandyCall line. Works with any carrier — no new number needed.',
  },
  {
    number: '3',
    title: 'Never Miss Another Lead',
    subtitle: 'Starting immediately',
    description:
      'Your AI handles every call, books jobs, sends confirmations, and delivers a daily summary to your inbox.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-white pt-20 pb-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeIn>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Turn missed calls<br className="hidden sm:block" />{' '}
              into <span className="text-emerald-600">booked jobs.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-500 leading-relaxed">
              HandyCall's AI answers every call, books appointments, and keeps your
              calendar full — even when you're on the job.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 transition"
              >
                Start Free 14-Day Trial
                <IconArrowRight className="h-4 w-4" stroke={2} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                View pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">No credit card required · Cancel anytime</p>
          </FadeIn>
        </div>
      </section>

      {/* ── Trust Strip ──────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-6">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-600">
            <span className="flex items-center gap-2"><IconPhone className="h-4 w-4 text-emerald-500" stroke={1.5} /> 24/7 AI call handling</span>
            <span className="flex items-center gap-2"><IconCalendar className="h-4 w-4 text-emerald-500" stroke={1.5} /> Live calendar booking</span>
            <span className="flex items-center gap-2"><IconUsers className="h-4 w-4 text-emerald-500" stroke={1.5} /> 500+ active pros</span>
            <span className="flex items-center gap-2"><IconStar className="h-4 w-4 text-emerald-500" stroke={1.5} /> 4.8 average rating</span>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <FadeIn>
            <div className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Features</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Everything you need to grow
              </h2>
              <p className="mt-3 max-w-xl text-slate-500">
                HandyCall handles the front desk so you can stay focused on the work.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <FadeIn key={feature.title} delay={i * 80}>
                <div className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                  <feature.icon className="mb-4 h-7 w-7 text-emerald-600" stroke={1.5} />
                  <h3 className="mb-2 text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">How It Works</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Up and running in minutes
              </h2>
              <p className="mt-3 max-w-xl text-slate-500">
                No technical setup required. If you can forward a call, you can use HandyCall.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <FadeIn key={step.title} delay={i * 100}>
                <div className="relative">
                  {i < steps.length - 1 && (
                    <div className="absolute top-5 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-2.5rem)] bg-slate-200 sm:block" />
                  )}
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-sm font-bold text-slate-900">
                    {step.number}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                  </div>
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-2">
                    <IconClock className="h-3.5 w-3.5" stroke={1.5} /> {step.subtitle}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-500">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-900 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
              Ready to grow your business?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
              Join 500+ service pros who rely on HandyCall to answer every call,
              fill every slot, and never miss a lead.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-3.5 text-base font-bold text-slate-900 hover:bg-slate-100 transition"
              >
                Start Free 14-Day Trial
                <IconArrowRight className="h-4 w-4" stroke={2} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 text-base font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                View Pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">No credit card · No contracts · Cancel anytime</p>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
