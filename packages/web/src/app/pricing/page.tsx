'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import {
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
} from '@tabler/icons-react';

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    cadence: '',
    highlight: false,
    badge: null,
    description: 'Get listed in the marketplace and start receiving homeowner requests.',
    features: [
      'Marketplace profile',
      'Appear in search results',
      'Lead inbox and quote requests',
      'Customer reviews on your profile',
      'Basic booking management',
      'Pay only per unlocked lead',
    ],
  },
  {
    name: 'Pro',
    price: 'SAR 149',
    cadence: '/month',
    highlight: true,
    badge: 'Most Popular',
    description: 'Full business toolkit for pros who want more visibility, automation, and fewer admin tasks.',
    features: [
      'Everything in Starter',
      'No per-lead unlock fee',
      'Priority placement in search',
      'CRM dashboard',
      'In-app payment collection',
      'Invoices and payout tracking',
      'Calendar sync and booking alerts',
      'Customer history and notes',
    ],
  },
  {
    name: 'Teams',
    price: 'SAR 349',
    cadence: '/month',
    highlight: false,
    badge: null,
    description: 'Best for growing service businesses managing multiple technicians or locations.',
    features: [
      'Everything in Pro',
      'Multi-user team access',
      'Advanced routing and assignment',
      'Performance analytics',
      'Multi-location support',
      'Priority support',
    ],
  },
];

const FAQS = [
  {
    q: 'Is Starter really free?',
    a: 'Yes. You can create a profile and appear in marketplace search for free. Starter only charges when you unlock a lead and view the customer’s full contact details.',
  },
  {
    q: 'What currency is used?',
    a: 'Public pricing is shown in Saudi Riyal (SAR) for the Saudi marketplace surface.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Pro and Teams are monthly plans with no long-term contract. You can cancel or downgrade from your billing settings.',
  },
  {
    q: 'What does Pro unlock?',
    a: 'Pro removes per-lead fees and adds search priority, CRM tools, payments, invoicing, booking alerts, and customer management.',
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 space-y-24">
        <FadeIn>
          <section className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-600">
              Pricing
            </p>
            <h1 className="text-[2.8rem] font-extrabold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl">
              Flexible pricing for Saudi service professionals
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
              Start with a free listing, then upgrade when you want better placement, payments,
              CRM, and business automation.
            </p>
            <p className="mt-2 text-sm text-slate-400" dir="rtl" lang="ar">
              ابدأ بخطة مجانية ثم طوّر أعمالك بخطط شهرية مصممة للسوق السعودي.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              {['Monthly billing', 'SAR pricing', 'No contracts', 'Cancel anytime'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <IconCircleCheck className="h-4 w-4 text-emerald-500" stroke={1.8} />
                  {item}
                </span>
              ))}
            </div>
          </section>
        </FadeIn>

        <section>
          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map((plan, index) => (
              <FadeIn key={plan.name} delay={index * 80}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-7 shadow-sm ${
                    plan.highlight
                      ? 'border-slate-800 bg-slate-900 text-white shadow-xl'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-emerald-500 px-3.5 py-1 text-xs font-bold text-white shadow-sm">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {plan.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-4xl font-bold tracking-tight ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                        {plan.cadence}
                      </span>
                    </div>
                    <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? 'text-slate-300' : 'text-slate-500'}`}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className={`mb-7 flex-1 space-y-2.5 border-t pt-5 ${plan.highlight ? 'border-slate-800' : 'border-slate-100'}`}>
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex items-start gap-2.5 text-sm ${plan.highlight ? 'text-slate-200' : 'text-slate-700'}`}>
                        <IconCheck className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? 'text-emerald-400' : 'text-emerald-500'}`} stroke={2} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.name === 'Starter' ? '/register?audience=pro' : '/register?audience=pro'}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                      plan.highlight
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {plan.name === 'Starter' ? 'Join Free' : `Choose ${plan.name}`}
                    <IconArrowRight className="h-4 w-4" stroke={1.8} />
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <FadeIn>
          <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-600">
                  What Pro changes
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  From lead listing to full operating system
                </h2>
                <p className="mt-4 text-slate-500">
                  The marketplace gets you discovered. Pro helps you close jobs faster, collect payments,
                  stay organized, and keep every customer relationship in one place.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  'Priority placement in search',
                  'Lead and customer CRM',
                  'Payments and payout tracking',
                  'Automated invoices',
                  'Booking alerts and calendar sync',
                  'Team-ready operations',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" stroke={2} />
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">FAQ</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Common questions</h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, index) => (
                <div key={faq.q} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50"
                  >
                    <span className="pr-4 text-sm font-semibold text-slate-900">{faq.q}</span>
                    <IconChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}
                      stroke={1.8}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="border-t border-slate-100 px-6 py-4">
                      <p className="text-sm leading-relaxed text-slate-500">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </FadeIn>
      </main>

      <SiteFooter />
    </div>
  );
}
