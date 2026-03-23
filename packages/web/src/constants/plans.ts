import { SubscriptionPlan } from '@handycall/shared';

type PlanLimits = {
  minutes: number;
  sms: number;
  contacts: number;
};

export type PlanCatalogEntry = {
  name: string;
  price: number;
  originalPrice: number;
  cadence: 'month';
  badge?: string;
  trialLabel?: string;
  limits: PlanLimits;
  featureHighlights: string[];
};

export const PLAN_CATALOG: Record<SubscriptionPlan, PlanCatalogEntry> = {
  [SubscriptionPlan.STARTER]: {
    name: 'Starter',
    price: 0,
    originalPrice: 0,
    cadence: 'month',
    badge: 'Free to list, pay per unlocked lead',
    limits: { minutes: 0, sms: 0, contacts: 300 },
    featureHighlights: [
      'Free marketplace profile',
      'Appear in customer search results',
      'Receive lead requests and job inquiries',
      'Preview the request before unlocking',
      'Pay only when you unlock a lead',
      'No AI receptionist or call automation included',
    ],
  },
  [SubscriptionPlan.PRO]: {
    name: 'Pro',
    price: 39.99,
    originalPrice: 49.99,
    cadence: 'month',
    badge: 'Marketplace + AI calling',
    trialLabel: 'Free trial — 14 days',
    limits: { minutes: 300, sms: 600, contacts: 1000 },
    featureHighlights: [
      'Everything in Starter, plus:',
      'AI receptionist for inbound calls',
      'Lead qualification and booking intake',
      'Managed or self-managed customer payments',
      'Call summaries, transcripts, and follow-up sequences',
      '30-day call recording retention',
    ],
  },
  [SubscriptionPlan.MAX]: {
    name: 'Max',
    price: 99.99,
    originalPrice: 149.99,
    cadence: 'month',
    badge: 'Growth plan for top pros',
    limits: { minutes: 750, sms: 1500, contacts: 3000 },
    featureHighlights: [
      'Everything in Pro, plus:',
      'CRM integrations and deeper analytics',
      'Sponsored placement in search results',
      'Advanced routing and multi-location support',
      '90-day call recording retention',
      'Priority support',
    ],
  },
};

export function formatUsd(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

export function getPlanPriceDisplay(plan: SubscriptionPlan) {
  const details = PLAN_CATALOG[plan];
  return {
    current: details.price === 0 ? 'Free' : formatUsd(details.price),
    original: details.originalPrice === 0 ? null : formatUsd(details.originalPrice),
    cadence: `per ${details.cadence}`,
  };
}

export function normalizePlan(plan?: string | SubscriptionPlan | null): SubscriptionPlan | undefined {
  if (!plan) return undefined;
  const upper = String(plan).toUpperCase();
  if (upper in PLAN_CATALOG) {
    return upper as SubscriptionPlan;
  }
  return undefined;
}
