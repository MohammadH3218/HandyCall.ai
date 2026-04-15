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

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    note: 'For new providers testing demand',
    features: [
      'Create your listing',
      'Appear in service and district search',
      'Basic account access',
    ],
  },
  {
    name: 'Pro',
    price: 'SAR 149 / month',
    note: 'For established solo operators',
    features: [
      'Everything in Starter',
      'Expanded business tools',
      'Stronger lead and booking workflow',
    ],
  },
  {
    name: 'Teams',
    price: 'SAR 349 / month',
    note: 'For growing operations and teams',
    features: [
      'Everything in Pro',
      'More operational capacity',
      'Built for multi-person service businesses',
    ],
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
            <div className="mb-12 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Pricing
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Choose the plan that fits your stage
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div key={plan.name} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">{plan.name}</p>
                  <h3 className="mt-4 text-3xl font-extrabold text-slate-900">{plan.price}</h3>
                  <p className="mt-2 text-sm text-slate-500">{plan.note}</p>

                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                        <IconChecklist className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" stroke={1.8} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/register"
                    className="mt-8 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Pro Sign Up
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
