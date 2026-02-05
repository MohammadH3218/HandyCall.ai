'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/marketing/site-header';
import { Check, X } from 'lucide-react';

// ─── Types & data ────────────────────────────────────────────────────────────

type PlanName = 'Starter' | 'Pro' | 'Max';

type PlanFeature = {
  label: string;
  available?: boolean;
};

type Plan = {
  name: PlanName;
  originalPrice: string;
  price: string;
  cadence: string;
  bestFor: string;
  badge?: string;
  trialLabel?: string;
  highlight?: boolean;
  features: PlanFeature[];
};

const plans: Plan[] = [
  {
    name: 'Starter',
    originalPrice: '$9.99',
    price: '$4.99',
    cadence: 'per week',
    bestFor: 'Solo operators getting started with AI answering.',
    badge: 'Limited-time offer',
    features: [
      { label: '50 minutes / week', available: true },
      { label: '100 SMS / week', available: true },
      { label: '200 contacts / week', available: true },
      { label: 'AI bookings + confirmations', available: true },
      { label: 'Call recording retention: 7 days', available: true },
      { label: 'Call summaries & transcripts', available: false },
      { label: 'After-hours routing', available: false },
      { label: 'Lead export via email / CSV', available: true },
    ],
    highlight: false,
  },
  {
    name: 'Pro',
    originalPrice: '$19.99',
    price: '$9.99',
    cadence: 'per week',
    bestFor: 'Growing teams that want consistent coverage and bookings.',
    badge: 'Most popular',
    trialLabel: 'Free trial – 14 days',
    features: [
      { label: '120 minutes / week', available: true },
      { label: '250 SMS / week', available: true },
      { label: '500 contacts / week', available: true },
      { label: 'AI bookings + SMS reminders', available: true },
      { label: 'Call recording retention: 30 days', available: true },
      { label: 'Call summaries & transcripts', available: true },
      { label: 'After-hours routing', available: true },
      { label: 'Lead export + webhook', available: true },
      { label: 'Priority support', available: true },
    ],
    highlight: true,
  },
  {
    name: 'Max',
    originalPrice: '$39.99',
    price: '$19.99',
    cadence: 'per week',
    bestFor: 'Busy crews that need higher weekly volume and follow-ups.',
    badge: 'Best value',
    features: [
      { label: '250 minutes / week', available: true },
      { label: '500 SMS / week', available: true },
      { label: '1000 contacts / week', available: true },
      { label: 'AI bookings + SMS reminders', available: true },
      { label: 'Call recording retention: 90 days', available: true },
      { label: 'Call summaries, transcripts, follow-ups', available: true },
      { label: 'Advanced routing (overflow + multi-location)', available: true },
      { label: 'Integrations + CRM sync', available: true },
      { label: 'Priority phone support', available: true },
    ],
    highlight: false,
  },
];

const inclusions = [
  'AI receptionist with your brand voice',
  'Real-time call handling and booking',
  'Lead capture and qualification',
  'Smart appointment booking',
  'Automated confirmations and reminders',
  'Usage dashboard with call recordings',
];

const featureComparisons: {
  label: string;
  values: Record<PlanName, string | boolean>;
}[] = [
  {
    label: 'Minutes / SMS / contacts per week',
    values: { Starter: '50 / 100 / 200', Pro: '120 / 250 / 500', Max: '250 / 500 / 1000' },
  },
  {
    label: 'Call recording retention',
    values: { Starter: '7 days', Pro: '30 days', Max: '90 days' },
  },
  {
    label: 'Call summaries and transcripts',
    values: { Starter: false, Pro: true, Max: true },
  },
  {
    label: 'AI bookings and reminders',
    values: { Starter: 'Included', Pro: 'Included', Max: 'Included' },
  },
  {
    label: 'After-hours routing & voicemail triage',
    values: { Starter: false, Pro: true, Max: true },
  },
  {
    label: 'Lead capture & CRM / export',
    values: { Starter: 'Email / CSV export', Pro: 'Email + webhook', Max: 'CRM sync + webhook' },
  },
  {
    label: 'SMS automation',
    values: { Starter: 'Confirmations', Pro: 'Confirmations + follow-ups', Max: 'Campaigns + follow-ups' },
  },
  {
    label: 'Support',
    values: { Starter: 'Standard', Pro: 'Priority', Max: 'Priority + phone handoff' },
  },
  {
    label: 'Free trial',
    values: { Starter: false, Pro: '14 days', Max: false },
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="mb-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">Pricing</p>
          <h1 className="mt-3 text-4xl font-display font-semibold tracking-[-0.02em] text-slate-900 md:text-5xl">
            Simple, weekly pricing.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-500">
            Choose a plan that matches your call volume. Upgrade at any time as your business grows.
          </p>
          <button
            onClick={() => setCompareOpen(true)}
            className="mt-5 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 underline underline-offset-4"
          >
            Compare all plans
          </button>
        </section>

        {/* ── Plan cards ──────────────────────────────────────────────────── */}
        <section className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border bg-white ${
                plan.highlight ? 'border-emerald-500 shadow-md shadow-emerald-100' : 'border-slate-200'
              }`}
            >
              {/* green top accent on the highlighted card */}
              {plan.highlight && <div className="absolute -top-px left-0 right-0 h-0.5 rounded-t-xl bg-emerald-500" />}

              {/* header */}
              <div className="px-6 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-display font-semibold text-slate-900">{plan.name}</h3>
                  <div className="flex gap-2">
                    {plan.trialLabel && (
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {plan.trialLabel}
                      </span>
                    )}
                    {plan.badge && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          plan.highlight
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* price */}
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.cadence}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm text-slate-400 line-through">{plan.originalPrice}</span>
                  <span className="text-xs font-semibold text-emerald-600">50 % off</span>
                </div>

                <p className="mt-2 text-sm text-slate-500">{plan.bestFor}</p>
              </div>

              {/* divider */}
              <div className="mx-6 my-5 border-t border-slate-100" />

              {/* feature list */}
              <div className="flex-1 px-6">
                <div className="space-y-3">
                  {plan.features.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-start gap-2.5 text-sm ${
                        item.available === false ? 'text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {item.available !== false ? (
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
                      )}
                      <span className={item.available === false ? 'line-through' : ''}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="p-6 pt-6">
                <Button asChild className="w-full" variant={plan.highlight ? 'default' : 'outline'}>
                  <Link href="/register">{plan.highlight ? 'Start free trial' : 'Get started'}</Link>
                </Button>
              </div>
            </div>
          ))}
        </section>

        {/* ── Included-in-every-plan strip ──────────────────────────────── */}
        <section className="mt-14 rounded-xl border border-slate-200 bg-slate-50 p-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inclusions.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-slate-500">All of the above is included in every plan.</p>
        </section>

        {/* ── Enterprise CTA ────────────────────────────────────────────── */}
        <section className="mt-16 rounded-2xl bg-slate-900 px-8 py-16 text-center">
          <h3 className="text-2xl font-display font-semibold text-white">Need a tailored rollout?</h3>
          <p className="mx-auto mt-2 max-w-md text-slate-400">
            Let us know your call volume and service mix. We will build a plan around your team.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 text-base bg-emerald-600 text-white shadow-none hover:bg-emerald-500 hover:shadow-none"
          >
            <Link href="/contact">Talk to sales</Link>
          </Button>
        </section>

        {/* ── Compare dialog ────────────────────────────────────────────── */}
        <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Compare plans side by side</DialogTitle>
              <DialogDescription>
                See exactly what is included at each tier. Grayed items are not available on that plan.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.name} className="p-3 text-left">
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-semibold text-slate-900">{plan.name}</span>
                          <span className="text-xs text-slate-400">
                            <span className="mr-1 line-through">{plan.originalPrice}</span>
                            {plan.price} {plan.cadence}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureComparisons.map((feature) => (
                    <tr key={feature.label} className="border-t border-slate-100">
                      <td className="p-3 font-medium text-slate-900">{feature.label}</td>
                      {plans.map((plan) => {
                        const value = feature.values[plan.name];
                        if (value === false) {
                          return (
                            <td key={plan.name} className="p-3 text-slate-400">
                              <div className="flex items-center gap-2">
                                <X className="h-4 w-4" />
                                <span>Not included</span>
                              </div>
                            </td>
                          );
                        }
                        if (value === true) {
                          return (
                            <td key={plan.name} className="p-3 text-emerald-700">
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-600" />
                                <span>Included</span>
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={plan.name} className="p-3 text-slate-900">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-600" />
                              <span>{value}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
