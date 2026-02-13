'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';

const tiers = [
  {
    name: 'Starter',
    price: '$4.99',
    cadence: '/week',
    description: 'For solo operators validating AI coverage.',
    included: ['50 call minutes', '100 SMS', 'Basic lead capture', 'Email export'],
    excluded: ['Advanced routing', 'Webhook automation'],
  },
  {
    name: 'Pro',
    price: '$9.99',
    cadence: '/week',
    description: 'For active teams running daily call volume.',
    included: ['120 call minutes', '250 SMS', 'Booking workflows', 'Transcript + summaries', 'Webhook integrations'],
    excluded: [],
    highlight: true,
  },
  {
    name: 'Max',
    price: '$19.99',
    cadence: '/week',
    description: 'For high-volume operations with stricter SLAs.',
    included: ['250 call minutes', '500 SMS', 'Priority support', 'Multi-location routing', 'Advanced integration controls'],
    excluded: [],
  },
];

const addOns = [
  { name: 'Extra call minutes', rate: '$0.14 / minute' },
  { name: 'Extra SMS volume', rate: '$0.03 / message' },
  { name: 'Dedicated onboarding', rate: 'Custom quote' },
];

const comparisons = [
  {
    label: 'Call minutes / week',
    Starter: '50',
    Pro: '120',
    Max: '250',
  },
  {
    label: 'SMS / week',
    Starter: '100',
    Pro: '250',
    Max: '500',
  },
  {
    label: 'Booking workflows',
    Starter: true,
    Pro: true,
    Max: true,
  },
  {
    label: 'Webhook integrations',
    Starter: false,
    Pro: true,
    Max: true,
  },
  {
    label: 'Priority support',
    Starter: false,
    Pro: false,
    Max: true,
  },
];

function ValueCell({ value }) {
  if (value === true) {
    return (
      <div className="flex items-center gap-1 text-xs text-success">
        <Check className="h-4 w-4" /> Included
      </div>
    );
  }

  if (value === false) {
    return (
      <div className="flex items-center gap-1 text-xs text-text-faint">
        <X className="h-4 w-4" /> Not included
      </div>
    );
  }

  return <div className="text-xs text-muted-foreground">{value}</div>;
}

export default function PricingPage() {
  const [openCompare, setOpenCompare] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1120px] px-6 py-14">
        <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit">Transparent weekly pricing</Badge>
            <h1 className="text-4xl font-semibold text-foreground">Choose your operating tier</h1>
            <p className="max-w-[640px] text-sm text-muted-foreground">
              Keep pricing predictable with fixed weekly tiers. Scale with usage-based add-ons when volume spikes.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/register">
                  Start onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" onClick={() => setOpenCompare(true)}>
                Compare plans
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage-based add-ons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {addOns.map((item) => (
                <div key={item.name} className="rounded-md border border-border bg-[#0f1115] px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.rate}</p>
                </div>
              ))}
              <p className="text-xs text-text-faint">Add-ons are metered after plan limits and billed at period close.</p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 grid gap-3 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className={tier.highlight ? 'border-primary/45 bg-primary/12' : ''}>
              <CardHeader>
                {tier.highlight ? (
                  <Badge variant="info" className="w-fit">Default recommendation</Badge>
                ) : null}
                <CardTitle>{tier.name}</CardTitle>
                <p className="text-3xl font-semibold text-foreground">
                  {tier.price}
                  <span className="text-sm font-medium text-muted-foreground">{tier.cadence}</span>
                </p>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {tier.included.map((line) => (
                  <p key={line} className="text-sm text-muted-foreground"> -  {line}</p>
                ))}
                {tier.excluded.map((line) => (
                  <p key={line} className="text-sm text-text-faint"> -  {line}</p>
                ))}
                <Button asChild className="mt-3 w-full">
                  <Link href="/register">Choose {tier.name}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-border bg-[#0f1115] p-5">
          <h2 className="text-xl font-semibold text-foreground">Security and billing confidence</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Stripe-backed subscriptions, signed integration payloads, and role-based dashboard access are standard across tiers.
          </p>
        </section>
      </main>

      <Dialog open={openCompare} onOpenChange={setOpenCompare}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Plan comparison</DialogTitle>
            <DialogDescription>Feature-level view across Starter, Pro, and Max.</DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-text-faint">Feature</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-text-faint">Starter</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-text-faint">Pro</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.06em] text-text-faint">Max</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => (
                  <tr key={row.label} className="border-b border-border/70">
                    <td className="px-3 py-2 text-sm font-medium text-foreground">{row.label}</td>
                    <td className="px-3 py-2"><ValueCell value={row.Starter} /></td>
                    <td className="px-3 py-2"><ValueCell value={row.Pro} /></td>
                    <td className="px-3 py-2"><ValueCell value={row.Max} /></td>
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

