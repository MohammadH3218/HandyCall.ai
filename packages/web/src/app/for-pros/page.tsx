import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconBolt,
  IconChartBar,
  IconCheck,
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

const PLANS = [
  {
    name: 'Starter',
    badge: null,
    price: { monthly: 'Free', annual: 'Free' },
    note: 'For new providers testing the marketplace',
    features: [
      'Create your pro listing',
      'Appear in service & district search',
      'Up to 5 service categories',
      'Basic profile with contact form',
      'District-level visibility',
    ],
    cta: 'Get started free',
    style: 'default' as const,
  },
  {
    name: 'Pro',
    badge: 'Most Popular',
    price: { monthly: 'SAR 149', annual: 'SAR 124' },
    note: 'For established solo operators',
    features: [
      'Everything in Starter',
      'Priority placement in search results',
      'Unlimited service categories',
      'Lead management inbox',
      'Booking request workflow',
      'Customer reviews & ratings',
      'Business analytics overview',
    ],
    cta: 'Start Pro',
    style: 'featured' as const,
  },
  {
    name: 'Teams',
    badge: null,
    price: { monthly: 'SAR 349', annual: 'SAR 290' },
    note: 'For growing multi-person operations',
    features: [
      'Everything in Pro',
      'Up to 5 team member accounts',
      'Advanced analytics dashboard',
      'Featured placement in categories',
      'Custom service area targeting',
      'Priority customer support',
    ],
    cta: 'Start Teams',
    style: 'default' as const,
  },
];

export default function ForProsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader proLinks />

      <main>
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

        <section id="pricing" className="border-t border-slate-100 bg-slate-50 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Pricing
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Choose the plan that fits your stage
              </h2>
              <p className="mt-3 text-slate-500">All plans include a 14-day free trial. No credit card required.</p>

              {/* Billing toggle */}
              <div className="mt-8 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <span className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Monthly</span>
                <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500">
                  Annual
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Save 17%</span>
                </span>
              </div>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => {
                const isFeatured = plan.style === 'featured';
                return (
                  <div
                    key={plan.name}
                    className={`group relative flex flex-col rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1.5 ${
                      isFeatured
                        ? 'bg-slate-900 shadow-2xl shadow-slate-900/20 hover:shadow-slate-900/30'
                        : 'border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {/* Popular badge */}
                    {plan.badge && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-white shadow-md">
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${isFeatured ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {plan.name}
                      </p>
                      <div className="mt-4 flex items-end gap-1">
                        <span className={`text-4xl font-extrabold tracking-tight ${isFeatured ? 'text-white' : 'text-slate-900'}`}>
                          {plan.price.monthly}
                        </span>
                        {plan.price.monthly !== 'Free' && (
                          <span className={`mb-1 text-sm ${isFeatured ? 'text-slate-400' : 'text-slate-400'}`}>/month</span>
                        )}
                      </div>
                      <p className={`mt-2 text-sm ${isFeatured ? 'text-slate-400' : 'text-slate-500'}`}>{plan.note}</p>
                    </div>

                    <div className={`my-7 h-px ${isFeatured ? 'bg-slate-700' : 'bg-slate-100'}`} />

                    <ul className="flex-1 space-y-3.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            isFeatured ? 'bg-emerald-500/20' : 'bg-emerald-50'
                          }`}>
                            <IconCheck className={`h-3 w-3 ${isFeatured ? 'text-emerald-400' : 'text-emerald-600'}`} stroke={2.5} />
                          </span>
                          <span className={`text-sm leading-relaxed ${isFeatured ? 'text-slate-300' : 'text-slate-600'}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/register"
                      className={`mt-8 flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
                        isFeatured
                          ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                          : 'border border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 group-hover:border-emerald-200'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>

            <p className="mt-10 text-center text-sm text-slate-400">
              All prices in Saudi Riyal (SAR) — billed monthly. Annual billing saves you 2 months.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
