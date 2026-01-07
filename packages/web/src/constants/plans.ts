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
  cadence: 'week';
  badge?: string;
  trialLabel?: string;
  limits: PlanLimits;
  featureHighlights: string[];
};

export const PLAN_CATALOG: Record<SubscriptionPlan, PlanCatalogEntry> = {
  [SubscriptionPlan.STARTER]: {
    name: 'Starter',
    price: 4.99,
    originalPrice: 9.99,
    cadence: 'week',
    badge: 'Limited-time offer',
    limits: { minutes: 50, sms: 100, contacts: 200 },
    featureHighlights: [
      '50 minutes/week',
      '100 SMS/week',
      '200 contacts/week',
      'AI bookings + SMS confirmations',
      'Call recording retention: 7 days',
      'Lead export via email/CSV',
    ],
  },
  [SubscriptionPlan.PRO]: {
    name: 'Pro',
    price: 9.99,
    originalPrice: 19.99,
    cadence: 'week',
    badge: 'Most popular',
    trialLabel: 'Free trial - 14 days',
    limits: { minutes: 120, sms: 250, contacts: 500 },
    featureHighlights: [
      '120 minutes/week',
      '250 SMS/week',
      '500 contacts/week',
      'AI bookings + SMS reminders',
      'Call recording retention: 30 days',
      'Call summaries & transcripts',
      'After-hours routing',
      'Lead export + Zapier/webhook',
      'Priority support',
    ],
  },
  [SubscriptionPlan.MAX]: {
    name: 'Max',
    price: 19.99,
    originalPrice: 39.99,
    cadence: 'week',
    badge: 'Best value',
    limits: { minutes: 250, sms: 500, contacts: 1000 },
    featureHighlights: [
      '250 minutes/week',
      '500 SMS/week',
      '1000 contacts/week',
      'AI bookings + SMS reminders',
      'Call recording retention: 90 days',
      'Call summaries, transcripts, and follow-ups',
      'Advanced routing (overflow + multi-location)',
      'Integrations + CRM sync',
      'Priority phone support',
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
    current: formatUsd(details.price),
    original: formatUsd(details.originalPrice),
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
