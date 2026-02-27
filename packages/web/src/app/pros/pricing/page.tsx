import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Pricing — Plans for Every Service Business',
  description:
    'Simple, transparent pricing for HandyCall. Starter at $19.99/mo, Pro at $39.99/mo, Max at $99.99/mo. No contracts. Start with a free 14-day trial.',
  openGraph: {
    title: 'HandyCall Pricing',
    description: 'Starter, Pro, and Max plans. No contracts. Start free for 14 days.',
  },
};
import {
  CheckCircle,
  X,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────── */

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$19.99',
    period: '/mo',
    description: 'Perfect for solo pros just getting started.',
    highlighted: false,
    minuteAllowance: '100 AI minutes/mo',
    smsAllowance: '200 SMS/mo',
    contacts: '250 contacts',
    features: [
      'AI call answering',
      'Online booking page',
      'Call transcripts & summaries',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$39.99',
    period: '/mo',
    description: 'The most popular plan for growing businesses.',
    highlighted: true,
    badge: 'Most Popular',
    trialNote: '14-day free trial included',
    minuteAllowance: '300 AI minutes/mo',
    smsAllowance: '500 SMS/mo',
    contacts: '1,000 contacts',
    features: [
      'AI call answering',
      'Online booking page',
      'Call transcripts & summaries',
      'Advanced analytics',
      'Automated follow-up sequences',
      'Stripe payment collection',
      'Priority email & chat support',
    ],
  },
  {
    id: 'max',
    name: 'Max',
    price: '$99.99',
    period: '/mo',
    description: 'Built for high-volume pros and small teams.',
    highlighted: false,
    minuteAllowance: 'Unlimited AI minutes',
    smsAllowance: '2,000 SMS/mo',
    contacts: 'Unlimited contacts',
    features: [
      'AI call answering',
      'Online booking page',
      'Call transcripts & summaries',
      'Advanced analytics',
      'Automated follow-up sequences',
      'Stripe payment collection & payouts',
      'Team management',
      'Invoicing',
      'API access',
      'Dedicated priority support',
    ],
  },
];

type FeatureRow = {
  feature: string;
  starter: boolean | string;
  pro: boolean | string;
  max: boolean | string;
};

const comparisonFeatures: FeatureRow[] = [
  { feature: 'AI call answering', starter: true, pro: true, max: true },
  { feature: 'SMS automation', starter: true, pro: true, max: true },
  { feature: 'Follow-up sequences', starter: false, pro: true, max: true },
  { feature: 'Analytics', starter: 'Basic', pro: 'Advanced', max: 'Advanced' },
  { feature: 'Team management', starter: false, pro: false, max: true },
  { feature: 'Invoicing', starter: false, pro: false, max: true },
  { feature: 'Stripe payouts', starter: false, pro: false, max: true },
  { feature: 'API access', starter: false, pro: false, max: true },
  { feature: 'Priority support', starter: false, pro: true, max: true },
];

const faqs = [
  {
    question: 'Is there really no credit card required for the trial?',
    answer:
      'Correct. You can start your 14-day Pro trial with just your email address. We will ask for a payment method when the trial ends so there are no surprise charges.',
  },
  {
    question: 'Can I cancel at any time?',
    answer:
      'Yes. Cancel your subscription at any time from your account settings with no cancellation fees or penalties. Your account remains active until the end of the current billing period.',
  },
  {
    question: 'What happens if I exceed my AI minute allowance?',
    answer:
      'We will notify you when you are approaching your limit. Additional minutes are billed at a flat per-minute overage rate. You can also upgrade your plan at any time to avoid overages.',
  },
  {
    question: 'Can I change plans mid-cycle?',
    answer:
      'Absolutely. Upgrade or downgrade your plan at any time. Upgrades take effect immediately and are prorated. Downgrades take effect at the start of your next billing cycle.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer:
      'Yes — annual subscriptions receive two months free compared to monthly billing. You can switch to annual billing from your account settings.',
  },
];

/* ────────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────────── */

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <CheckCircle className="mx-auto h-5 w-5 text-emerald-500" />;
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-slate-300" />;
  }
  return <span className="text-sm font-medium text-slate-700">{value}</span>;
}

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

export default function ProsPricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader variant="pro" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50 pb-20 pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-30%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Pricing
            </span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-xl text-slate-500">
              No hidden fees. No long-term contracts. Cancel anytime.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <Zap className="h-4 w-4" />
              Start with a free 14-day Pro trial &mdash; no credit card required
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Plan Cards ───────────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-6 sm:grid-cols-3">
            {plans.map((plan, i) => (
              <FadeIn key={plan.id} delay={i * 80}>
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-7 shadow-sm transition ${
                    plan.highlighted
                      ? 'border-emerald-400 bg-white shadow-xl shadow-emerald-100 ring-2 ring-emerald-400'
                      : 'border-slate-200 hover:border-emerald-200 hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900 shadow">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                    {plan.name}
                  </div>
                  <div className="mb-1 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                    <span className="mb-1.5 text-sm text-slate-400">{plan.period}</span>
                  </div>
                  <p className="mb-2 text-sm text-slate-500">{plan.description}</p>

                  {/* Usage limits */}
                  <div className="mb-5 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="font-semibold">{plan.minuteAllowance}</div>
                    <div>{plan.smsAllowance}</div>
                    <div>{plan.contacts}</div>
                  </div>

                  {plan.trialNote && (
                    <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      {plan.trialNote}
                    </div>
                  )}

                  <ul className="mb-8 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-slate-600">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`w-full rounded-xl font-semibold ${
                      plan.highlighted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : ''
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    <Link href="/register?audience=pro">
                      {plan.highlighted ? 'Start Free Trial' : 'Get Started'}
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Comparison Table ──────────────────────────── */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Compare all features
              </h2>
              <p className="mt-2 text-slate-500">See exactly what&rsquo;s included in each plan.</p>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-left font-semibold text-slate-600">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-slate-600">Starter</th>
                    <th className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        Pro <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">Popular</span>
                      </span>
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-slate-600">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="px-6 py-3.5 text-sm font-medium text-slate-700">
                        {row.feature}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <FeatureCell value={row.starter} />
                      </td>
                      <td className="bg-emerald-50/30 px-4 py-3.5 text-center">
                        <FeatureCell value={row.pro} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <FeatureCell value={row.max} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4">
          <FadeIn>
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-2 text-slate-500">
                Still have questions?{' '}
                <Link href="/contact" className="font-semibold text-emerald-600 hover:underline">
                  Contact our team
                </Link>
              </p>
            </div>
          </FadeIn>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={faq.question} delay={i * 60}>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-base font-semibold text-slate-900">
                    {faq.question}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="bg-emerald-600 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold text-white">
              <Shield className="h-3.5 w-3.5" />
              No credit card required
            </div>
            <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              Start your free 14-day Pro trial today
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-emerald-100">
              Get full access to all Pro features. No credit card, no commitment.
              Upgrade, downgrade, or cancel anytime.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 gap-2 rounded-xl bg-white px-10 text-base font-bold text-emerald-700 hover:bg-emerald-50 shadow-xl"
              >
                <Link href="/register?audience=pro">
                  Start Free 14-Day Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Link
                href="/contact"
                className="text-sm font-semibold text-emerald-100 hover:text-white underline underline-offset-4"
              >
                Talk to sales
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
