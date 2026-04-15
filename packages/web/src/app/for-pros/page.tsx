import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconBolt,
  IconChartBar,
  IconChecklist,
  IconCreditCard,
  IconMapPin,
  IconUsers,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = {
  title: 'For Pros',
  description:
    'Grow your Riyadh service business with HandyCall. Get discovered, manage requests, and turn marketplace demand into booked jobs.',
};

const BENEFITS = [
  {
    icon: IconUsers,
    title: 'Get discovered by local homeowners',
    description: 'Show up where Riyadh customers are already searching for services by district and category.',
  },
  {
    icon: IconChecklist,
    title: 'Manage leads and requests in one place',
    description: 'Keep your requests, bookings, and account activity organized without juggling multiple tools.',
  },
  {
    icon: IconCreditCard,
    title: 'Monetize with clearer pricing',
    description: 'Present your services more clearly and upgrade into the business tools that fit your stage.',
  },
  {
    icon: IconChartBar,
    title: 'Build a stronger local presence',
    description: 'Give your business a cleaner digital storefront inside a focused Riyadh marketplace.',
  },
];

type PlanFeature = { text: string; included: boolean };

type Plan = {
  name: string;
  badge: string;
  price: string;
  period: string | null;
  note: string;
  highlight: boolean;
  cta: string;
  ctaHref: string;
  features: PlanFeature[];
};

const PLANS: Plan[] = [
  {
    name: 'Starter',
    badge: 'GET STARTED',
    price: 'Free',
    period: null,
    note: 'For new providers testing marketplace demand',
    highlight: false,
    cta: 'Create Free Listing',
    ctaHref: '/register',
    features: [
      { text: 'Public business listing', included: true },
      { text: 'Appear in service & district search', included: true },
      { text: 'Basic request inbox', included: true },
      { text: 'HandyCall Pro verified badge', included: false },
      { text: 'Priority search placement', included: false },
      { text: 'Business analytics dashboard', included: false },
    ],
  },
  {
    name: 'Pro',
    badge: 'MOST POPULAR',
    price: 'SAR 149',
    period: '/ month',
    note: 'For established solo operators ready to grow',
    highlight: true,
    cta: 'Start Pro Plan',
    ctaHref: '/register',
    features: [
      { text: 'Everything in Starter', included: true },
      { text: 'HandyCall Pro verified badge', included: true },
      { text: 'Priority placement in search results', included: true },
      { text: 'Advanced lead & booking workflow', included: true },
      { text: 'Customer review management', included: true },
      { text: 'Business analytics dashboard', included: false },
    ],
  },
  {
    name: 'Teams',
    badge: 'FOR GROWING OPS',
    price: 'SAR 349',
    period: '/ month',
    note: 'For multi-person operations and agencies',
    highlight: false,
    cta: 'Start Teams Plan',
    ctaHref: '/register',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Team member accounts', included: true },
      { text: 'Business analytics dashboard', included: true },
      { text: 'Bulk request management', included: true },
      { text: 'Dedicated onboarding support', included: true },
      { text: 'Custom service area configuration', included: true },
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
    </svg>
  );
}

export default function ForProsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader proLinks />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-white px-4 pb-24 pt-24">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 60% -10%, rgba(16,185,129,0.09) 0%, transparent 72%)',
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                For Service Professionals
              </span>
              <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                Turn Riyadh search demand into booked work.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
                HandyCall gives service businesses a cleaner way to get discovered, organize incoming requests, and grow in a marketplace built around how homeowners actually search.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Pro Sign Up
                </Link>
                <Link
                  href="/pro/login"
                  className="rounded-xl border border-slate-300 px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Pro Login
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                {BENEFITS.slice(0, 4).map((benefit) => (
                  <div key={benefit.title} className="rounded-2xl bg-white p-5 shadow-sm">
                    <benefit.icon className="h-6 w-6 text-emerald-600" stroke={1.8} />
                    <h2 className="mt-4 text-base font-bold text-slate-900">{benefit.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Pros Join */}
        <section className="px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Why Pros Join
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Built for businesses that want better local visibility
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <IconMapPin className="h-7 w-7 text-emerald-600" stroke={1.8} />
                <h3 className="mt-4 text-xl font-bold text-slate-900">District-based discovery</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Customers search by Riyadh neighborhoods and districts, which helps your business show up in a more relevant local context.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <IconBolt className="h-7 w-7 text-emerald-600" stroke={1.8} />
                <h3 className="mt-4 text-xl font-bold text-slate-900">Cleaner request flow</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  A simpler public experience means better-qualified search intent and a cleaner path into your pro account.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <IconChecklist className="h-7 w-7 text-emerald-600" stroke={1.8} />
                <h3 className="mt-4 text-xl font-bold text-slate-900">One place to grow</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Your public listing, incoming requests, onboarding, and business tools can all live inside the same HandyCall account.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-slate-100 bg-slate-50 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Pricing
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Choose the plan that fits your stage
              </h2>
              <p className="mt-3 text-slate-500">No contracts. Cancel or upgrade anytime.</p>
            </div>

            <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
              {PLANS.map((plan) =>
                plan.highlight ? (
                  /* Pro — highlighted card */
                  <div
                    key={plan.name}
                    className="group relative overflow-hidden rounded-3xl border-2 border-emerald-500 bg-white shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                  >
                    {/* Emerald accent band */}
                    <div className="bg-emerald-600 px-8 py-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-white">
                        {plan.badge}
                      </span>
                    </div>

                    <div className="p-8">
                      <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                        {plan.name}
                      </p>
                      <div className="mt-4 flex items-end gap-1">
                        <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                        {plan.period && (
                          <span className="mb-1 text-sm font-medium text-slate-400">{plan.period}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{plan.note}</p>

                      <div className="mt-6 space-y-3.5">
                        {plan.features.map((feature) => (
                          <div key={feature.text} className="flex items-start gap-2.5">
                            {feature.included ? <CheckIcon /> : <DashIcon />}
                            <span
                              className={`text-sm leading-snug ${
                                feature.included ? 'font-medium text-slate-700' : 'text-slate-400'
                              }`}
                            >
                              {feature.text}
                            </span>
                          </div>
                        ))}
                      </div>

                      <Link
                        href={plan.ctaHref}
                        className="mt-8 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-colors duration-200 hover:bg-emerald-700"
                      >
                        {plan.cta}
                      </Link>

                      <p className="mt-3 text-center text-xs text-slate-400">
                        First 30 days free — no card required
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Starter / Teams — standard card */
                  <div
                    key={plan.name}
                    className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                        {plan.name}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700">
                        {plan.badge}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                      {plan.period && (
                        <span className="mb-1 text-sm font-medium text-slate-400">{plan.period}</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{plan.note}</p>

                    <div className="mt-6 space-y-3.5">
                      {plan.features.map((feature) => (
                        <div key={feature.text} className="flex items-start gap-2.5">
                          {feature.included ? <CheckIcon /> : <DashIcon />}
                          <span
                            className={`text-sm leading-snug ${
                              feature.included ? 'font-medium text-slate-700' : 'text-slate-400'
                            }`}
                          >
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={plan.ctaHref}
                      className="mt-8 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {plan.cta}
                    </Link>
                  </div>
                )
              )}
            </div>

            <p className="mt-8 text-center text-sm text-slate-400">
              Questions about which plan is right for you?{' '}
              <Link href="/contact" className="font-semibold text-emerald-600 hover:underline">
                Contact us
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
