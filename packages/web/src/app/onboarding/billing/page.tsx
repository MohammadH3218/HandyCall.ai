'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { IconCheck, IconLoader2, IconLock, IconArrowRight, IconCreditCard } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

type PlanId = 'STARTER' | 'PRO' | 'TEAMS';

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Pay only for leads you choose to unlock.',
    features: [
      'Public marketplace profile',
      'Receive job requests',
      'Pay-per-lead (unlock when ready)',
      'Basic analytics',
      'Customer messaging',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 'SAR 149',
    period: '/month',
    description: 'No per-lead fees. Built for serious pros.',
    features: [
      'Everything in Starter',
      'No per-lead unlock fees',
      'Priority placement in search',
      'Advanced analytics & CRM',
      'Integrated payments',
      'Verified badge on profile',
    ],
    badge: 'Most popular',
    highlight: true,
  },
  {
    id: 'TEAMS',
    name: 'Teams',
    price: 'SAR 349',
    period: '/month',
    description: 'For businesses with multiple technicians.',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Team scheduling & dispatch',
      'Shared inbox & job queue',
      'Multi-location support',
      'Dedicated account manager',
    ],
  },
];

export default function OnboardingBillingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('STARTER');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getMyPro()
      .then((pro: any) => {
        const status = pro?.status;
        // Redirect away if already past this stage
        if (status === 'ACTIVE') {
          router.replace('/pro/dashboard');
          return;
        }
        if (status === 'PENDING_REVIEW' || status === 'REJECTED' || status === 'SUSPENDED') {
          router.replace('/pro/review-status');
          return;
        }
        // ONBOARDING (or no status) — this is the right place, show the page
        setChecking(false);
      })
      .catch(() => {
        // No pro record yet — still allow billing selection
        setChecking(false);
      });
  }, [router]);

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      if (selectedPlan === 'STARTER') {
        // Activate the free starter plan directly
        try {
          await apiClient.activateStarterPlan();
        } catch {
          // Non-critical if starter endpoint isn't available yet
        }
      } else {
        // Save plan intent — billing is collected post-approval
        try {
          await apiClient.updateMyProMarketplaceProfile({ selected_plan: selectedPlan });
        } catch {
          // Non-critical
        }
      }
      router.replace('/pro/review-status');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <IconLoader2 className="h-7 w-7 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Final step</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Choose your plan
          </h1>
          <p className="mt-2 text-slate-500">
            You can upgrade or downgrade at any time after your profile is approved.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                'relative flex flex-col rounded-2xl border p-5 text-left transition-all',
                selectedPlan === plan.id
                  ? plan.highlight
                    ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 shadow-md'
                    : 'border-emerald-400 bg-white ring-2 ring-emerald-100 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              {/* Selected indicator */}
              <div className={cn(
                'mb-3 flex h-5 w-5 items-center justify-center self-end rounded-full border-2 transition-colors',
                selectedPlan === plan.id
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-slate-300 bg-white',
              )}>
                {selectedPlan === plan.id && (
                  <IconCheck className="h-3 w-3 text-white" stroke={3} />
                )}
              </div>

              <p className="text-lg font-extrabold text-slate-900">{plan.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={cn(
                  'text-2xl font-extrabold',
                  plan.highlight ? 'text-emerald-600' : 'text-slate-900',
                )}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-slate-400">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{plan.description}</p>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                    <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" stroke={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Payment method — placeholder */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <IconCreditCard className="h-5 w-5 text-slate-500" stroke={1.8} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Payment method</h2>
              <p className="text-sm text-slate-500">Required for lead unlocking and paid plans.</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <IconLock className="h-6 w-6 text-slate-400" stroke={1.5} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Payment integration coming soon</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              We're integrating with Mada, STC Pay, and credit cards. You won't be charged until
              your profile is approved and you unlock your first lead.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {['Mada', 'STC Pay', 'Visa', 'Mastercard'].map((method) => (
                <span
                  key={method}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {selectedPlan === 'STARTER' && (
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              On the Starter plan, you'll only be charged when you choose to unlock a lead. No monthly fee.
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-[15px] font-semibold text-white',
              'shadow-sm shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {saving ? (
              <IconLoader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Continue with {PLANS.find((p) => p.id === selectedPlan)?.name}
                <IconArrowRight className="h-5 w-5" stroke={2.5} />
              </>
            )}
          </button>
          <p className="text-xs text-slate-400">
            No payment required until your profile is approved.
          </p>
        </div>
      </div>
    </div>
  );
}
