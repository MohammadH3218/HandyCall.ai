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
    badge: 'Free to list',
    limits: { minutes: 0, sms: 0, contacts: 300 },
    featureHighlights: [
      'Free marketplace profile',
      'Appear in customer search results',
      'Receive lead requests and job inquiries',
      'Preview the request before unlocking',
      'Customer reviews on your profile',
      'Pay only when you unlock a lead',
    ],
  },
  [SubscriptionPlan.PRO]: {
    name: 'Pro',
    price: 149,
    originalPrice: 0,
    cadence: 'month',
    badge: 'Most popular',
    limits: { minutes: 0, sms: 0, contacts: 1000 },
    featureHighlights: [
      'Everything in Starter, plus:',
      'No per-lead unlock fee',
      'Priority placement in search',
      'CRM dashboard',
      'In-app payment collection',
      'Invoices and payout tracking',
      'Calendar sync and booking alerts',
    ],
  },
  [SubscriptionPlan.MAX]: {
    name: 'Teams',
    price: 349,
    originalPrice: 0,
    cadence: 'month',
    badge: 'Best for growing teams',
    limits: { minutes: 0, sms: 0, contacts: 5000 },
    featureHighlights: [
      'Everything in Pro, plus:',
      'Multi-user team access',
      'Advanced routing and assignment',
      'Performance analytics',
      'Multi-location support',
      'Priority support',
    ],
  },
};

export function formatSar(amount: number) {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsd(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getPlanPriceDisplay(plan: SubscriptionPlan) {
  const details = PLAN_CATALOG[plan];
  return {
    current: details.price === 0 ? 'Free' : formatSar(details.price),
    original: details.originalPrice === 0 ? null : formatSar(details.originalPrice),
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
