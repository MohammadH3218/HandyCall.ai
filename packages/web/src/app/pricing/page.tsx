'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/marketing/site-header';
import { Check, X, ArrowRight, Phone, MessageSquare, Users } from 'lucide-react';

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
  limits: { minutes: number; sms: number; contacts: number };
};

const plans: Plan[] = [
  {
    name: 'Starter',
    originalPrice: '$9.99',
    price: '$4.99',
    cadence: 'per week',
    bestFor: 'Solo operators getting started with AI answering.',
    badge: 'Limited-time offer',
    limits: { minutes: 50, sms: 100, contacts: 200 },
    features: [
      { label: '50 minutes/week', available: true },
      { label: '100 SMS/week', available: true },
      { label: '200 contacts/week', available: true },
      { label: 'AI bookings + confirmations', available: true },
      { label: 'Call recording retention: 7 days', available: true },
      { label: 'Call summaries & transcripts', available: false },
      { label: 'After-hours routing', available: false },
      { label: 'Lead export via email/CSV', available: true },
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
    trialLabel: 'Free trial - 14 days',
    limits: { minutes: 120, sms: 250, contacts: 500 },
    features: [
      { label: '120 minutes/week', available: true },
      { label: '250 SMS/week', available: true },
      { label: '500 contacts/week', available: true },
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
    limits: { minutes: 250, sms: 500, contacts: 1000 },
    features: [
      { label: '250 minutes/week', available: true },
      { label: '500 SMS/week', available: true },
      { label: '1000 contacts/week', available: true },
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
    values: {
      Starter: '50 / 100 / 200',
      Pro: '120 / 250 / 500',
      Max: '250 / 500 / 1000',
    },
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
    label: 'Lead capture & CRM/export',
    values: { Starter: 'Email/CSV export', Pro: 'Email + webhook', Max: 'CRM sync + webhook' },
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

type SliderConfig = {
  key: 'minutes' | 'sms' | 'contacts';
  label: string;
  icon: typeof Phone;
  min: number;
  max: number;
  step: number;
  unit: string;
};

const sliders: SliderConfig[] = [
  { key: 'minutes', label: 'Call minutes / week', icon: Phone, min: 0, max: 300, step: 5, unit: 'min' },
  { key: 'sms', label: 'SMS messages / week', icon: MessageSquare, min: 0, max: 600, step: 10, unit: 'SMS' },
  { key: 'contacts', label: 'New contacts / week', icon: Users, min: 0, max: 1200, step: 25, unit: 'contacts' },
];

function getRecommendedPlan(values: { minutes: number; sms: number; contacts: number }): PlanName | 'custom' {
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

export default function PricingPage() {
  const [compareOpen, setCompareOpen] = useState(false);
  const [calc, setCalc] = useState({ minutes: 40, sms: 80, contacts: 150 });

  const recommended = getRecommendedPlan(calc);

  const updateCalc = useCallback((key: 'minutes' | 'sms' | 'contacts', value: number) => {
    setCalc((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="relative min-h-screen bg-white text-foreground">
      <div className="bg-grid bg-grid-fade pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-12">
          <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge className="bg-emerald-100 text-emerald-700">Weekly plans built for service teams</Badge>
              <h1 className="text-4xl font-display text-slate-900 md:text-5xl">
                Pricing that matches your call volume.
              </h1>
              <p className="text-lg text-slate-600">
                Choose a weekly plan that fits how many calls and appointments you manage. Upgrade any time as demand
                grows.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/contact">Talk to sales</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Existing customer? Log in</Link>
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setCompareOpen(true)}>
                  Compare plans
                </Button>
              </div>
            </div>

            <Card className="border-emerald-100 bg-white/80 shadow-lg shadow-emerald-100">
              <CardHeader>
                <CardTitle>Every plan includes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inclusions.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-900">
                  Need a custom package? We can tune minutes and onboarding for larger teams.
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ── Plan cards ── */}
          <section className="mt-14 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isRecommended = recommended === plan.name;
              return (
                <Card
                  key={plan.name}
                  className={`relative flex h-full flex-col border-emerald-100 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                    plan.highlight ? 'bg-white shadow-lg shadow-emerald-100 ring-1 ring-emerald-200' : 'bg-white/90'
                  } ${isRecommended ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                        Recommended for you
                      </span>
                    </div>
                  )}
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <div className="flex gap-2">
                        {plan.trialLabel && <Badge className="bg-emerald-100 text-emerald-700">{plan.trialLabel}</Badge>}
                        {plan.badge && <Badge className="bg-emerald-100 text-emerald-700">{plan.badge}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm text-slate-400 line-through">{plan.originalPrice}</span>
                      <span className="text-4xl font-semibold text-slate-900">{plan.price}</span>
                      <span className="text-sm text-slate-500">{plan.cadence}</span>
                    </div>
                    <p className="text-sm text-slate-600">{plan.bestFor}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {plan.features.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2 text-sm ${
                          item.available === false
                            ? 'text-slate-400 line-through decoration-slate-300'
                            : 'text-emerald-800'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.available === false ? 'bg-slate-300' : 'bg-emerald-500'
                          }`}
                        />
                        {item.label}
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="mt-auto">
                    <Button asChild className="group w-full gap-2">
                      <Link href="/register">
                        Get started
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </section>

          {/* ── Plan calculator ── */}
          <section className="mt-16 overflow-hidden rounded-[28px] border border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/10 to-white p-8 shadow-lg shadow-emerald-50/50 md:p-12">
            <div className="text-center">
              <Badge className="bg-emerald-100/80 text-emerald-700">Plan calculator</Badge>
              <h2 className="mt-3 text-3xl font-display text-slate-900 md:text-4xl">
                Find the right plan for your volume
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-slate-600">
                Drag the sliders to match your weekly usage and we&apos;ll show which plan covers you.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-2xl space-y-10">
              {sliders.map((slider) => {
                const Icon = slider.icon;
                const value = calc[slider.key];
                const pct = ((value - slider.min) / (slider.max - slider.min)) * 100;

                return (
                  <div key={slider.key}>
                    {/* Label row */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{slider.label}</span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold tabular-nums text-slate-900 shadow-sm">
                        {value} <span className="font-normal text-slate-500">{slider.unit}</span>
                      </div>
                    </div>

                    {/* Custom slider track with fill */}
                    <div className="relative h-2 rounded-full bg-slate-100">
                      {/* Filled portion */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-75"
                        style={{ width: `${pct}%` }}
                      />
                      {/* Native input (transparent, sits on top) */}
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

                    {/* Plan tier segments below */}
                    <div className="mt-3 flex gap-1.5">
                      {plans.map((plan, i) => {
                        const prevLimit = i === 0 ? 0 : plans[i - 1].limits[slider.key];
                        const thisLimit = plan.limits[slider.key];
                        const segmentWidth = ((thisLimit - prevLimit) / slider.max) * 100;
                        const fitsInPlan = value <= thisLimit && (i === 0 || value > plans[i - 1].limits[slider.key]);
                        const isUnder = value <= thisLimit;

                        return (
                          <div key={plan.name} style={{ width: `${segmentWidth}%` }}>
                            <div
                              className={`h-1.5 rounded-full transition-colors duration-200 ${
                                fitsInPlan
                                  ? 'bg-emerald-400'
                                  : isUnder
                                    ? 'bg-emerald-100'
                                    : 'bg-slate-100'
                              }`}
                            />
                            <div className="mt-1.5 flex items-center justify-between">
                              <span
                                className={`text-[11px] font-medium transition-colors duration-200 ${
                                  fitsInPlan ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {plan.name}
                              </span>
                              <span className="text-[10px] tabular-nums text-slate-400">
                                {thisLimit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Overflow segment beyond Max */}
                      {(() => {
                        const maxLimit = plans[plans.length - 1].limits[slider.key];
                        const overflowWidth = ((slider.max - maxLimit) / slider.max) * 100;
                        if (overflowWidth <= 0) return null;
                        const isOverflow = value > maxLimit;
                        return (
                          <div style={{ width: `${overflowWidth}%` }}>
                            <div
                              className={`h-1.5 rounded-full transition-colors duration-200 ${
                                isOverflow ? 'bg-amber-300' : 'bg-slate-50'
                              }`}
                            />
                            <div className="mt-1.5">
                              <span
                                className={`text-[11px] font-medium transition-colors duration-200 ${
                                  isOverflow ? 'text-amber-600' : 'text-slate-300'
                                }`}
                              >
                                Custom
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation result */}
            <div className="mx-auto mt-12 max-w-2xl">
              <div
                className={`rounded-2xl border p-6 text-center transition-all duration-300 ${
                  recommended === 'custom'
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-emerald-200 bg-emerald-50/60'
                }`}
              >
                {recommended === 'custom' ? (
                  <>
                    <p className="text-lg font-semibold text-slate-900">
                      Your usage exceeds our standard plans
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      We can build a custom package for high-volume teams. Let&apos;s talk.
                    </p>
                    <Button asChild size="lg" className="mt-4">
                      <Link href="/contact">Contact sales</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-emerald-700">Based on your usage, we recommend</p>
                    <p className="mt-1 text-3xl font-display font-semibold text-slate-900">
                      {recommended}{' '}
                      <span className="text-lg font-normal text-slate-500">
                        {plans.find((p) => p.name === recommended)?.price}/week
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {plans.find((p) => p.name === recommended)?.bestFor}
                    </p>
                    <Button asChild size="lg" className="group mt-4 gap-2">
                      <Link href="/register">
                        Get started with {recommended}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── Tailored CTA ── */}
          <section className="mt-16 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-10 text-center shadow-lg shadow-emerald-50">
            <h3 className="text-2xl font-display text-slate-900">Need a tailored rollout?</h3>
            <p className="mt-2 text-slate-600">
              Let us know your call volume and service mix. We will build a plan around your team.
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild size="lg" variant="secondary" className="bg-white text-emerald-700 shadow">
                <Link href="/contact">Start the conversation</Link>
              </Button>
            </div>
          </section>

          {/* ── Compare dialog ── */}
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
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Feature
                      </th>
                      {plans.map((plan) => (
                        <th key={plan.name} className="p-3 text-left">
                          <div className="flex flex-col gap-1">
                            <span className="text-base font-semibold text-foreground">{plan.name}</span>
                            <span className="text-xs text-muted-foreground">
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
                      <tr key={feature.label} className="border-t border-border/60">
                        <td className="p-3 font-medium text-foreground">{feature.label}</td>
                        {plans.map((plan) => {
                          const value = feature.values[plan.name];
                          if (value === false) {
                            return (
                              <td key={plan.name} className="p-3 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <X className="h-4 w-4 text-muted-foreground" />
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
                            <td key={plan.name} className="p-3 text-foreground">
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
    </div>
  );
}
