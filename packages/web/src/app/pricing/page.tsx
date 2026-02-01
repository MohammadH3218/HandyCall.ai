'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiteHeader } from '@/components/marketing/site-header';
import { Check, X } from 'lucide-react';

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
      { label: '50 minutes/week', available: true },
      { label: '100 SMS/week', available: true },
      { label: '200 contacts/week', available: true },
      { label: 'AI bookings + SMS confirmations', available: true },
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
    features: [
      { label: '120 minutes/week', available: true },
      { label: '250 SMS/week', available: true },
      { label: '500 contacts/week', available: true },
      { label: 'AI bookings + SMS reminders', available: true },
      { label: 'Call recording retention: 30 days', available: true },
      { label: 'Call summaries & transcripts', available: true },
      { label: 'After-hours routing', available: true },
      { label: 'Lead export + Zapier/webhook', available: true },
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
      { label: '250 minutes/week', available: true },
      { label: '500 SMS/week', available: true },
      { label: '1000 contacts/week', available: true },
      { label: 'AI bookings + SMS reminders', available: true },
      { label: 'Call recording retention: 90 days', available: true },
      { label: 'Call summaries, transcripts, and follow-ups', available: true },
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
  'Automated SMS confirmations and reminders',
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

export default function PricingPage() {
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12">
        <section className="space-y-6 text-center">
          <Badge className="mx-auto bg-primary/10 text-primary">Weekly plans built for service teams</Badge>
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">Pick the plan that fits your call volume.</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Straightforward pricing. Contact us to activate your subscription and we&apos;ll tailor the setup for your
            team.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
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
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex h-full flex-col border-emerald-100 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                plan.highlight ? 'bg-white shadow-lg shadow-emerald-100' : 'bg-white/80'
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-2xl">
                  {plan.name}
                  <div className="flex gap-2">
                    {plan.trialLabel && <Badge className="bg-emerald-100 text-emerald-700">{plan.trialLabel}</Badge>}
                    {plan.badge && <Badge className="bg-emerald-100 text-emerald-700">{plan.badge}</Badge>}
                  </div>
                </CardTitle>
                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  <span className="text-xl text-muted-foreground line-through">{plan.originalPrice}</span>
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.bestFor}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.features.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 text-sm ${
                      item.available === false
                        ? 'text-muted-foreground line-through decoration-muted-foreground/60'
                        : 'text-emerald-800'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.available === false ? 'bg-gray-300' : 'bg-emerald-500'
                      }`}
                    />
                    {item.label}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link href="/contact">Contact to buy</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>

        <section className="mt-16 rounded-2xl border border-emerald-100 bg-white/80 p-8 shadow-inner">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-900">Every plan includes</h2>
              <p className="text-muted-foreground">
                We keep it simple: the same AI quality and reception experience across all tiers. Increase limits as you
                grow.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {inclusions.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-900"
                >
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-10 text-center shadow-lg shadow-emerald-50">
          <h3 className="text-2xl font-bold text-gray-900">Want a custom package?</h3>
          <p className="mt-2 text-muted-foreground">
            Need more minutes or dedicated onboarding? Tell us what you need and we&apos;ll tailor a plan.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="lg" variant="secondary" className="bg-white text-emerald-700 shadow">
              <Link href="/contact">Start the conversation</Link>
            </Button>
          </div>
        </section>

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
  );
}
