// @ts-nocheck
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import {
  IconCheck,
  IconX,
  IconArrowRight,
  IconPhone,
  IconMessage,
  IconUsers,
  IconCircleCheck,
  IconChevronDown,
} from '@tabler/icons-react';

/* ── Data ─────────────────────────────────────────────────── */

const plans = [
  {
    name: 'Starter',
    originalPrice: null,
    price: 'Free',
    cadence: '',
    bestFor: 'Get your free marketplace listing and start receiving job requests.',
    badge: null,
    trialLabel: null,
    highlight: false,
    limits: { minutes: 0, sms: 0, contacts: 300 },
    features: [
      { label: 'Free marketplace profile', included: true },
      { label: 'Appear in customer search results', included: true },
      { label: 'Receive lead requests & job inquiries', included: true },
      { label: 'Preview request before unlocking', included: true },
      { label: 'Pay per unlocked lead only', included: true },
      { label: 'AI receptionist for inbound calls', included: false },
      { label: 'Call summaries & transcripts', included: false },
      { label: 'Follow-up sequences', included: false },
      { label: 'Sponsored placement in search', included: false },
      { label: 'CRM integrations', included: false },
    ],
  },
  {
    name: 'Pro',
    originalPrice: '$29.99',
    price: '$19.99',
    cadence: '/mo',
    bestFor: 'Pros who want AI calling + full marketplace coverage.',
    badge: 'Most popular',
    trialLabel: '14-day free trial',
    highlight: true,
    limits: { minutes: 300, sms: 600, contacts: 1000 },
    features: [
      { label: 'Everything in Starter', included: true },
      { label: '300 AI call minutes / month', included: true },
      { label: '600 SMS / month', included: true },
      { label: '1,000 contacts', included: true },
      { label: 'AI receptionist for inbound calls', included: true },
      { label: 'Lead qualification & booking intake', included: true },
      { label: 'Call summaries & transcripts', included: true },
      { label: 'Smart follow-up sequences', included: true },
      { label: 'Call recording (30-day)', included: true },
      { label: 'Sponsored placement in search', included: false },
      { label: 'CRM integrations', included: false },
    ],
  },
  {
    name: 'Max',
    originalPrice: '$79.99',
    price: '$49.99',
    cadence: '/mo',
    bestFor: 'Top pros and teams that need full coverage and growth tools.',
    badge: 'Best for teams',
    trialLabel: null,
    highlight: false,
    limits: { minutes: 750, sms: 1500, contacts: 3000 },
    features: [
      { label: 'Everything in Pro', included: true },
      { label: '750 AI call minutes / month', included: true },
      { label: '1,500 SMS / month', included: true },
      { label: '3,000 contacts', included: true },
      { label: 'Sponsored placement in search results', included: true },
      { label: 'CRM integrations (Zapier, webhooks)', included: true },
      { label: 'Advanced routing & multi-location', included: true },
      { label: 'Call recording (90-day)', included: true },
      { label: 'Dedicated account manager', included: true },
    ],
  },
];

const inclusions = [
  'Free marketplace profile',
  'Appear in customer search results',
  'Receive and preview job requests',
  'Verified badge on your profile',
  'Customer messaging and inquiry management',
  'Mobile-friendly dashboard',
  'U.S.-friendly onboarding and support',
];

const featureComparisons = [
  { label: 'Monthly price', values: { Starter: 'Free', Pro: '$19.99', Max: '$49.99' } },
  { label: 'Marketplace profile', values: { Starter: true, Pro: true, Max: true } },
  { label: 'Appear in search results', values: { Starter: true, Pro: true, Max: true } },
  { label: 'Sponsored placement', values: { Starter: false, Pro: false, Max: true } },
  { label: 'Lead requests (pay-per-unlock)', values: { Starter: true, Pro: true, Max: true } },
  { label: 'AI call minutes / month', values: { Starter: '—', Pro: '300 min', Max: '750 min' } },
  { label: 'SMS / month', values: { Starter: '—', Pro: '600', Max: '1,500' } },
  { label: 'Active contacts', values: { Starter: '300', Pro: '1,000', Max: '3,000' } },
  { label: 'AI receptionist for inbound calls', values: { Starter: false, Pro: true, Max: true } },
  { label: 'Call summaries & transcripts', values: { Starter: false, Pro: true, Max: true } },
  { label: 'Smart follow-up sequences', values: { Starter: false, Pro: true, Max: true } },
  { label: 'Call recording retention', values: { Starter: '—', Pro: '30 days', Max: '90 days' } },
  { label: 'CRM integrations (Zapier, webhooks)', values: { Starter: false, Pro: false, Max: true } },
  { label: 'Advanced routing & multi-location', values: { Starter: false, Pro: false, Max: true } },
  { label: 'Support', values: { Starter: 'Standard', Pro: 'Priority', Max: 'Dedicated manager' } },
  { label: 'Free trial', values: { Starter: false, Pro: '14 days', Max: false } },
];

const faqs = [
  {
    q: 'Is Starter really free?',
    a: 'Yes — creating your marketplace profile and appearing in search results is completely free. You only pay when you choose to unlock a customer lead to see their full contact details.',
  },
  {
    q: 'What does "pay per unlocked lead" mean?',
    a: 'When a customer submits a job request, you can preview the job details before deciding to unlock it. Unlocking gives you the customer\'s contact info so you can follow up. Each unlock costs a small fee.',
  },
  {
    q: 'What does Pro add on top of Starter?',
    a: 'Pro adds an AI receptionist that handles your inbound calls 24/7 — qualifying leads, booking appointments, and sending automated SMS follow-ups. It also includes call summaries, transcripts, and 300 AI call minutes per month.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — no contracts, no cancellation fees. You can downgrade or cancel from your dashboard settings at any time.',
  },
  {
    q: 'Is there a free trial for Pro?',
    a: 'Yes — the Pro plan includes a 14-day free trial with no credit card required. You can cancel before the trial ends at no charge.',
  },
  {
    q: 'Are prices in U.S. dollars?',
    a: 'Yes. Starter is free, Pro is $19.99/month, and Max is $49.99/month.',
  },
];

const sliders = [
  { key: 'minutes', label: 'AI call minutes / month', icon: IconPhone, min: 0, max: 900, step: 10, unit: 'min' },
  { key: 'sms', label: 'SMS messages / month', icon: IconMessage, min: 0, max: 1800, step: 25, unit: 'SMS' },
  { key: 'contacts', label: 'Active contacts', icon: IconUsers, min: 0, max: 3600, step: 50, unit: 'contacts' },
];

function getRecommendedPlan(values) {
  for (const plan of plans) {
    if (
      values.minutes <= plan.limits.minutes &&
      values.sms <= plan.limits.sms &&
      values.contacts <= plan.limits.contacts
    ) {
      return plan.name;
    }
  }
  return 'custom';
}

/* ── Page ─────────────────────────────────────────────────── */

export default function PricingPage() {
  const [calc, setCalc] = useState({ minutes: 120, sms: 250, contacts: 400 });
  const [openFaq, setOpenFaq] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const recommended = getRecommendedPlan(calc);
  const updateCalc = useCallback((key, value) => {
    setCalc((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 space-y-24">

        {/* ── Hero ── */}
        <FadeIn>
          <section className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Pricing</p>
            <h1 className="text-[2.8rem] font-extrabold leading-[1.06] tracking-tight text-slate-900 sm:text-5xl">
              Pricing that pays for itself<br className="hidden sm:block" /> with one booked job.
            </h1>
            <p className="mt-5 max-w-lg mx-auto text-lg text-slate-500 leading-relaxed">
              Choose a monthly plan that fits your call volume. No contracts, no setup fees.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              {['No contracts', 'Keep your number', 'Setup in 10 minutes', 'Spam call filtering', 'Cancel anytime'].map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5">
                  <IconCircleCheck className="h-4 w-4 text-emerald-500" stroke={1.5} />
                  {b}
                </span>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Every plan includes ── */}
        <FadeIn>
          <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-8">
            <div className="grid gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Every plan includes</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {inclusions.map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <IconCheck className="h-4 w-4 shrink-0 text-emerald-500" stroke={2} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center md:border-l md:border-slate-200 md:pl-8">
                <div className="rounded-2xl border border-emerald-100 bg-white px-6 py-5 text-center shadow-sm min-w-[180px]">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Part-time receptionist</p>
                  <p className="text-2xl font-bold text-slate-400 line-through">$4,000/mo</p>
                  <p className="mt-3 text-xs font-semibold text-emerald-700 mb-1">HandyCall Pro</p>
                  <p className="text-2xl font-bold text-emerald-600">$19.99/mo</p>
                  <p className="mt-1 text-xs text-slate-400">24/7 AI coverage included</p>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── Plan Cards ── */}
        <section>
          <FadeIn>
            <div className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Plans</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Pick your coverage level.
              </h2>
            </div>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 80}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    plan.highlight
                      ? 'border-slate-800 bg-slate-900 text-white shadow-xl'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Badges */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className={`rounded-full px-3.5 py-1 text-xs font-bold shadow-sm ${
                        plan.highlight ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
                      }`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {plan.name}
                      </span>
                      {plan.trialLabel && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          plan.highlight ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {plan.trialLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {plan.originalPrice && (
                        <span className={`text-sm line-through ${plan.highlight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {plan.originalPrice}
                        </span>
                      )}
                      <span className={`text-4xl font-bold tracking-tight ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {plan.price}
                      </span>
                      {plan.cadence && (
                        <span className={`text-sm ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                          {plan.cadence}
                        </span>
                      )}
                    </div>
                    <p className={`mt-2 text-sm leading-relaxed ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.bestFor}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className={`flex-1 space-y-2.5 border-t pt-5 mb-7 ${plan.highlight ? 'border-slate-800' : 'border-slate-100'}`}>
                    {plan.features.map((item) => (
                      <li
                        key={item.label}
                        className={`flex items-start gap-2.5 text-sm ${
                          !item.included
                            ? plan.highlight ? 'text-slate-600' : 'text-slate-400'
                            : plan.highlight ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        {item.included
                          ? <IconCheck className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? 'text-emerald-400' : 'text-emerald-500'}`} stroke={2} />
                          : <IconX className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? 'text-slate-600' : 'text-slate-300'}`} stroke={1.5} />
                        }
                        <span className={!item.included ? 'line-through decoration-1' : ''}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/register?audience=pro"
                    className={`group flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                      plan.highlight
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Start booking more jobs
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" stroke={1.5} />
                  </Link>
                  <p className={`mt-2.5 text-center text-xs ${plan.highlight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Setup in 10 min · Keep your number · Cancel anytime
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── Plan Calculator ── */}
        <FadeIn>
          <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-8 md:p-12">
            <div className="text-center mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Plan calculator</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Find the right plan for your volume.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-slate-500">
                Drag the sliders to match your monthly usage and we'll show which plan covers you.
              </p>
            </div>

            <div className="mx-auto max-w-2xl space-y-10">
              {sliders.map((slider) => {
                const Icon = slider.icon;
                const value = calc[slider.key];
                const pct = ((value - slider.min) / (slider.max - slider.min)) * 100;
                return (
                  <div key={slider.key}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-white">
                          <Icon className="h-4 w-4 text-emerald-600" stroke={1.5} />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{slider.label}</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold tabular-nums text-slate-900 shadow-sm">
                        {value} <span className="font-normal text-slate-400">{slider.unit}</span>
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full bg-slate-200">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-75"
                        style={{ width: `${pct}%` }}
                      />
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={value}
                        onChange={(e) => updateCalc(slider.key, Number(e.target.value))}
                        className="calc-slider absolute inset-0 h-full w-full"
                      />
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {plans.map((plan, pi) => {
                        const prevLimit = pi === 0 ? 0 : plans[pi - 1].limits[slider.key];
                        const thisLimit = plan.limits[slider.key];
                        const segmentWidth = ((thisLimit - prevLimit) / slider.max) * 100;
                        const fitsHere = value <= thisLimit && (pi === 0 || value > plans[pi - 1].limits[slider.key]);
                        const isUnder = value <= thisLimit;
                        return (
                          <div key={plan.name} style={{ width: `${segmentWidth}%` }}>
                            <div className={`h-1.5 rounded-full transition-colors duration-200 ${fitsHere ? 'bg-emerald-400' : isUnder ? 'bg-emerald-100' : 'bg-slate-200'}`} />
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className={`text-[11px] font-medium transition-colors duration-200 ${fitsHere ? 'text-emerald-700' : 'text-slate-400'}`}>{plan.name}</span>
                              <span className="text-[10px] tabular-nums text-slate-400">{thisLimit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            <div className="mx-auto mt-12 max-w-2xl">
              <div className={`rounded-2xl border p-7 text-center transition-all duration-300 ${
                recommended === 'custom'
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-emerald-200 bg-white shadow-sm'
              }`}>
                {recommended === 'custom' ? (
                  <>
                    <p className="text-lg font-semibold text-slate-900">Your usage exceeds our standard plans</p>
                    <p className="mt-1.5 text-sm text-slate-500">We can build a custom package for high-volume teams.</p>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 mt-5 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
                    >
                      Contact sales <IconArrowRight className="h-4 w-4" stroke={1.5} />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">Based on your usage, we recommend</p>
                    <p className="mt-1.5 text-4xl font-bold tracking-tight text-slate-900">
                      {recommended}
                      <span className="ml-2 text-xl font-normal text-slate-500">
                        {plans.find((p) => p.name === recommended)?.price}{plans.find((p) => p.name === recommended)?.cadence}
                      </span>
                    </p>
                    <p className="mt-1.5 text-sm text-slate-500">
                      {plans.find((p) => p.name === recommended)?.bestFor}
                    </p>
                    <Link
                      href="/register?audience=pro"
                      className="inline-flex items-center gap-2 mt-5 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Start with {recommended}
                      <IconArrowRight className="h-4 w-4" stroke={1.5} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── Compare table (collapsible) ── */}
        <FadeIn>
          <section>
            <button
              onClick={() => setShowCompare(!showCompare)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 text-left shadow-sm hover:bg-slate-50 transition"
            >
              <div>
                <p className="text-base font-bold text-slate-900">Compare all features</p>
                <p className="text-sm text-slate-500">See exactly what's included at each tier</p>
              </div>
              <IconChevronDown
                className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${showCompare ? 'rotate-180' : ''}`}
                stroke={1.5}
              />
            </button>

            {showCompare && (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="p-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400 w-1/2">Feature</th>
                      {plans.map((plan) => (
                        <th key={plan.name} className="p-4 text-left">
                          <p className="font-bold text-slate-900">{plan.name}</p>
                          <p className="text-xs text-slate-400 font-normal">
                            {plan.originalPrice ? <><span className="line-through mr-1">{plan.originalPrice}</span>{plan.price}{plan.cadence}</> : plan.price}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparisons.map((feature) => (
                      <tr key={feature.label} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-slate-700">{feature.label}</td>
                        {plans.map((plan) => {
                          const val = feature.values[plan.name];
                          if (val === false) return (
                            <td key={plan.name} className="p-4">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <IconX className="h-4 w-4" stroke={1.5} />
                              </div>
                            </td>
                          );
                          if (val === true) return (
                            <td key={plan.name} className="p-4">
                              <div className="flex items-center gap-1.5 text-emerald-600">
                                <IconCheck className="h-4 w-4" stroke={2} />
                              </div>
                            </td>
                          );
                          return (
                            <td key={plan.name} className="p-4">
                              <span className="text-xs font-medium text-slate-600">{val}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </FadeIn>

        {/* ── FAQs ── */}
        <FadeIn>
          <section className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">FAQ</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Common questions</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition"
                  >
                    <span className="text-sm font-semibold text-slate-900 pr-4">{faq.q}</span>
                    <IconChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                      stroke={1.5}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-slate-100 px-6 py-4">
                      <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Bottom CTA ── */}
        <FadeIn>
          <section className="rounded-2xl bg-slate-900 p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">High volume?</p>
            <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Need coverage for a larger team?
            </h3>
            <p className="mx-auto mt-3 max-w-md text-slate-400">
              Share your call load and service mix. We'll build a rollout that protects your bookings.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 mt-6 rounded-xl bg-white px-8 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
            >
              Plan your rollout <IconArrowRight className="h-4 w-4" stroke={1.5} />
            </Link>
          </section>
        </FadeIn>

      </main>

      <SiteFooter />
    </div>
  );
}
