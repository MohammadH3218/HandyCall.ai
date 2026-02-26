'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Check, X, ArrowRight, Phone, MessageSquare, Users, CheckCircle2 } from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────── */

const plans = [
  {
    name: 'Starter',
    originalPrice: '$29.99',
    price: '$19.99',
    cadence: 'per month',
    bestFor: 'Solo operators getting started with AI answering.',
    badge: 'Great for solo operators',
    limits: { minutes: 100, sms: 200, contacts: 300 },
    features: [
      { label: '100 minutes/month', available: true },
      { label: '200 SMS/month', available: true },
      { label: '300 contacts', available: true },
      { label: 'AI receptionist with brand voice', available: true },
      { label: 'Smart appointment booking', available: true },
      { label: 'Lead capture & qualification', available: true },
      { label: 'Automated SMS confirmations', available: true },
      { label: 'Spam & robocall filtering', available: true },
      { label: 'Call recording (7-day retention)', available: true },
      { label: 'Call summaries & transcripts', available: false },
      { label: 'After-hours routing', available: false },
      { label: 'Human transfer', available: false },
      { label: 'CRM integrations', available: false },
    ],
    highlight: false,
  },
  {
    name: 'Pro',
    originalPrice: '$49.99',
    price: '$39.99',
    cadence: 'per month',
    bestFor: 'Growing teams that want full coverage and smart follow-ups.',
    badge: 'Most popular',
    trialLabel: '14-day free trial',
    limits: { minutes: 300, sms: 600, contacts: 1000 },
    features: [
      { label: '300 minutes/month', available: true },
      { label: '600 SMS/month', available: true },
      { label: '1,000 contacts', available: true },
      { label: 'Everything in Starter', available: true },
      { label: 'Call summaries & transcripts', available: true },
      { label: 'After-hours routing', available: true },
      { label: 'Human transfer to your phone', available: true },
      { label: 'Smart follow-up sequences', available: true },
      { label: 'Call recording (30-day retention)', available: true },
      { label: 'Priority support', available: true },
      { label: 'CRM integrations', available: false },
      { label: 'Website chat widget', available: false },
    ],
    highlight: true,
  },
  {
    name: 'Max',
    originalPrice: '$149.99',
    price: '$99.99',
    cadence: 'per month',
    bestFor: 'Busy crews that need high volume, integrations, and full power.',
    badge: 'Best value for teams',
    limits: { minutes: 750, sms: 1500, contacts: 3000 },
    features: [
      { label: '750 minutes/month', available: true },
      { label: '1,500 SMS/month', available: true },
      { label: '3,000 contacts', available: true },
      { label: 'Everything in Pro', available: true },
      { label: 'CRM integrations (Zapier, webhooks)', available: true },
      { label: 'Advanced routing (overflow + multi-location)', available: true },
      { label: 'Website chat widget', available: true },
      { label: 'Call recording (90-day retention)', available: true },
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
  'Spam call filtering and robocall blocking',
  'Usage dashboard with call recordings',
];

const costComparison = [
  { label: 'Receptionist (part-time)', value: '$3,200/mo', detail: 'Wages + taxes + coverage gaps', highlight: false },
  { label: 'HandyCall Pro', value: '$39.99/mo', detail: '24/7 coverage + bookings + transcripts', highlight: true },
  { label: 'HandyCall Max', value: '$99.99/mo', detail: 'Full power + CRM + integrations', highlight: true },
];

const volumeExamples = [
  { trade: 'HVAC', calls: '80–150 calls/month', minutes: '200–350 min', plan: 'Pro' },
  { trade: 'Plumbing', calls: '50–120 calls/month', minutes: '100–250 min', plan: 'Pro' },
  { trade: 'Pest Control', calls: '120–250 calls/month', minutes: '300–500 min', plan: 'Max' },
];

const pricingTrustBadges = [
  'No contracts', 'Keep your number', 'Setup in 10 minutes',
  'Spam call filtering', 'Human fallback available', 'TCPA-friendly scripts',
];

const featureComparisons = [
  { label: 'Minutes / SMS / contacts per month', values: { Starter: '100 / 200 / 300', Pro: '300 / 600 / 1,000', Max: '750 / 1,500 / 3,000' } },
  { label: 'Call recording retention', values: { Starter: '7 days', Pro: '30 days', Max: '90 days' } },
  { label: 'Call summaries & transcripts', values: { Starter: false, Pro: true, Max: true } },
  { label: 'AI bookings & SMS confirmations', values: { Starter: 'Included', Pro: 'Included', Max: 'Included' } },
  { label: 'After-hours routing', values: { Starter: false, Pro: true, Max: true } },
  { label: 'Human transfer', values: { Starter: false, Pro: true, Max: true } },
  { label: 'Smart follow-up sequences', values: { Starter: false, Pro: true, Max: true } },
  { label: 'CRM integrations (Zapier, webhooks)', values: { Starter: false, Pro: false, Max: true } },
  { label: 'Advanced routing (overflow + multi-location)', values: { Starter: false, Pro: false, Max: true } },
  { label: 'Website chat widget', values: { Starter: false, Pro: false, Max: true } },
  { label: 'Lead export', values: { Starter: 'Email/CSV', Pro: 'Email/CSV', Max: 'CRM sync + webhook' } },
  { label: 'Support', values: { Starter: 'Standard', Pro: 'Priority', Max: 'Priority + phone' } },
  { label: 'Free trial', values: { Starter: false, Pro: '14 days', Max: false } },
];

const sliders = [
  { key: 'minutes', label: 'Call minutes / month', icon: Phone, min: 0, max: 900, step: 10, unit: 'min' },
  { key: 'sms', label: 'SMS messages / month', icon: MessageSquare, min: 0, max: 1800, step: 25, unit: 'SMS' },
  { key: 'contacts', label: 'Active contacts', icon: Users, min: 0, max: 3600, step: 50, unit: 'contacts' },
];

function getRecommendedPlan(values) {
  for (const plan of plans) {
    if (values.minutes <= plan.limits.minutes && values.sms <= plan.limits.sms && values.contacts <= plan.limits.contacts) {
      return plan.name;
    }
  }
  return 'custom';
}

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

export default function PricingPage() {
  const [compareOpen, setCompareOpen] = useState(false);
  const [calc, setCalc] = useState({ minutes: 120, sms: 250, contacts: 400 });
  const recommended = getRecommendedPlan(calc);
  const updateCalc = useCallback((key, value) => { setCalc((prev) => ({ ...prev, [key]: value })); }, []);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16">

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Monthly plans for service teams
            </span>
            <h1 className="text-[2.6rem] font-bold leading-[1.08] tracking-tight text-slate-900 md:text-5xl">
              Pricing that pays for itself with one booked job.
            </h1>
            <p className="max-w-md text-lg text-slate-500">
              Choose a monthly plan that fits your call volume. Most service jobs cover the entire month.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 gap-2 px-6">
                <Link href="/register">
                  Start booking more jobs <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link href="/contact">Book a demo</Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-12 px-6" onClick={() => setCompareOpen(true)}>
                Compare all features
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              {pricingTrustBadges.map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Every-plan-includes card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Every plan includes</p>
            <div className="mt-4 space-y-3">
              {inclusions.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
              Need a custom package? We can tune minutes and onboarding for larger teams.
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            COST COMPARISON
        ══════════════════════════════════════════ */}
        <section className="mt-16">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Cost comparison</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Fraction of a receptionist.
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {costComparison.map((row) => (
                <div
                  key={row.label}
                  className={`rounded-2xl border p-5 ${
                    row.highlight
                      ? 'border-emerald-200 bg-white shadow-sm'
                      : 'border-slate-200 bg-white/60'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-500">{row.label}</p>
                  <p className={`mt-1.5 text-2xl font-bold tracking-tight ${row.highlight ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {row.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{row.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Example only. Costs vary by region and coverage needs.</p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PLAN CARDS
        ══════════════════════════════════════════ */}
        <section className="mt-16">
          <div className="mb-8 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Plans</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Pick your coverage level.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan) => {
              const isRecommended = recommended === plan.name;
              const isDark = plan.highlight;
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                    isDark
                      ? 'border-slate-800 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white'
                  } ${isRecommended && !isDark ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-emerald-600 px-3.5 py-1 text-xs font-bold text-white shadow-sm">
                        Recommended for you
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {plan.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.trialLabel && (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                            {plan.trialLabel}
                          </span>
                        )}
                        {plan.badge && (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600'}`}>
                            {plan.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className={`text-sm line-through ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{plan.originalPrice}</span>
                      <span className={`text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                      <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.cadence}</span>
                    </div>
                    <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.bestFor}</p>
                  </div>

                  <div className={`flex-1 space-y-2.5 border-t pt-5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    {plan.features.map((item) => (
                      <div key={item.label} className={`flex items-start gap-2.5 text-sm ${item.available === false ? (isDark ? 'text-slate-600' : 'text-slate-400') : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                        {item.available === false
                          ? <X className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                          : <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                        }
                        <span className={item.available === false ? 'line-through decoration-1' : ''}>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button
                      asChild
                      className={`group w-full gap-2 ${isDark ? 'bg-emerald-500 text-white hover:bg-emerald-400' : ''}`}
                      variant={isDark ? 'default' : 'default'}
                    >
                      <Link href="/register">
                        Start booking more jobs
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                    <p className={`mt-2.5 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Setup in 10 min · Keep your number · Cancel anytime
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            VOLUME EXAMPLES
        ══════════════════════════════════════════ */}
        <section className="mt-16">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Call volume examples</p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Typical months by trade.</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Use these as a starting point, then dial in your volume in the calculator below.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/contact">Talk through your volume</Link>
              </Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {volumeExamples.map((example) => (
                <div key={example.trade} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-900">{example.trade}</p>
                  <p className="mt-1.5 text-xs text-slate-500">{example.calls}</p>
                  <p className="text-xs text-slate-500">{example.minutes}</p>
                  <p className="mt-2.5 text-xs font-bold text-emerald-700">Suggested: {example.plan}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PLAN CALCULATOR
        ══════════════════════════════════════════ */}
        <section className="mt-16 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-8 md:p-12">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Plan calculator</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Find the right plan for your volume.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-500">
              Drag the sliders to match your monthly usage and we&apos;ll show which plan covers you.
            </p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-slate-400">
              If your average job is $350, one booking covers the month.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl space-y-10">
            {sliders.map((slider) => {
              const Icon = slider.icon;
              const value = calc[slider.key];
              const pct = ((value - slider.min) / (slider.max - slider.min)) * 100;
              return (
                <div key={slider.key}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{slider.label}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold tabular-nums text-slate-900 shadow-sm">
                      {value} <span className="font-normal text-slate-400">{slider.unit}</span>
                    </div>
                  </div>
                  <div className="relative h-2 rounded-full bg-slate-200">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-75" style={{ width: `${pct}%` }} />
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
                    {plans.map((plan, i) => {
                      const prevLimit = i === 0 ? 0 : plans[i - 1].limits[slider.key];
                      const thisLimit = plan.limits[slider.key];
                      const segmentWidth = ((thisLimit - prevLimit) / slider.max) * 100;
                      const fitsInPlan = value <= thisLimit && (i === 0 || value > plans[i - 1].limits[slider.key]);
                      const isUnder = value <= thisLimit;
                      return (
                        <div key={plan.name} style={{ width: `${segmentWidth}%` }}>
                          <div className={`h-1.5 rounded-full transition-colors duration-200 ${fitsInPlan ? 'bg-emerald-400' : isUnder ? 'bg-emerald-100' : 'bg-slate-200'}`} />
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className={`text-[11px] font-medium transition-colors duration-200 ${fitsInPlan ? 'text-emerald-700' : 'text-slate-400'}`}>{plan.name}</span>
                            <span className="text-[10px] tabular-nums text-slate-400">{thisLimit}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(() => {
                      const maxLimit = plans[plans.length - 1].limits[slider.key];
                      const overflowWidth = ((slider.max - maxLimit) / slider.max) * 100;
                      if (overflowWidth <= 0) return null;
                      const isOverflow = value > maxLimit;
                      return (
                        <div style={{ width: `${overflowWidth}%` }}>
                          <div className={`h-1.5 rounded-full transition-colors duration-200 ${isOverflow ? 'bg-amber-300' : 'bg-slate-100'}`} />
                          <div className="mt-1.5">
                            <span className={`text-[11px] font-medium transition-colors duration-200 ${isOverflow ? 'text-amber-600' : 'text-slate-300'}`}>Custom</span>
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
            <div className={`rounded-2xl border p-7 text-center transition-all duration-300 ${recommended === 'custom' ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-white shadow-sm'}`}>
              {recommended === 'custom' ? (
                <>
                  <p className="text-lg font-semibold text-slate-900">Your usage exceeds our standard plans</p>
                  <p className="mt-1.5 text-sm text-slate-500">We can build a custom package for high-volume teams. Let&apos;s talk.</p>
                  <Button asChild size="lg" className="mt-5">
                    <Link href="/contact">Contact sales</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-emerald-700">Based on your usage, we recommend</p>
                  <p className="mt-1.5 text-4xl font-bold tracking-tight text-slate-900">
                    {recommended}
                    <span className="ml-2 text-xl font-normal text-slate-500">
                      {plans.find((p) => p.name === recommended)?.price}/mo
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500">{plans.find((p) => p.name === recommended)?.bestFor}</p>
                  <Button asChild size="lg" className="group mt-5 gap-2">
                    <Link href="/register">
                      Start with {recommended}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            BOTTOM CTA
        ══════════════════════════════════════════ */}
        <section className="mt-16 overflow-hidden rounded-2xl bg-slate-900 p-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">High volume?</span>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Need coverage for a larger team?
          </h3>
          <p className="mx-auto mt-3 max-w-md text-slate-400">
            Share your call load and service mix. We&apos;ll build a rollout that protects your bookings.
          </p>
          <Button asChild size="lg" className="mt-6 gap-2 bg-white text-slate-900 hover:bg-slate-100">
            <Link href="/contact">
              Plan your rollout <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>

      {/* ══════════════════════════════════════════
          COMPARE DIALOG
      ══════════════════════════════════════════ */}
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
                  <th className="p-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.name} className="p-3 text-left">
                      <p className="text-base font-bold text-slate-900">{plan.name}</p>
                      <p className="text-xs text-slate-500">
                        <span className="mr-1 line-through">{plan.originalPrice}</span>
                        {plan.price} {plan.cadence}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureComparisons.map((feature) => (
                  <tr key={feature.label} className="border-t border-slate-100">
                    <td className="p-3 text-sm font-medium text-slate-700">{feature.label}</td>
                    {plans.map((plan) => {
                      const value = feature.values[plan.name];
                      if (value === false) return (
                        <td key={plan.name} className="p-3">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <X className="h-4 w-4" />
                            <span className="text-xs">Not included</span>
                          </div>
                        </td>
                      );
                      if (value === true) return (
                        <td key={plan.name} className="p-3">
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <Check className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs">Included</span>
                          </div>
                        </td>
                      );
                      return (
                        <td key={plan.name} className="p-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Check className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs">{value}</span>
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

      <SiteFooter />
    </div>
  );
}
