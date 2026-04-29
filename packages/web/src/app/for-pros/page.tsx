import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconBolt,
  IconChartBar,
  IconCheck,
  IconChecklist,
  IconCoin,
  IconFileText,
  IconMapPin,
  IconMessage,
  IconUsers,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = {
  title: 'For Pros',
  description:
    'Grow your Riyadh service business with HandyCall. Get discovered, manage requests, and turn marketplace demand into booked jobs.',
};

const BENEFITS = [
  {
    icon: IconUsers,
    title: 'Get discovered by local homeowners',
    description: 'Show up where Riyadh customers are already searching for services by district and category.',
  },
  {
    icon: IconChecklist,
    title: 'Manage leads and requests in one place',
    description: 'Keep your requests, bookings, and account activity organized without juggling multiple tools.',
  },
  {
    icon: IconCoin,
    title: 'Only pay when you win work',
    description: 'No monthly subscription. A lead fee applies only when you accept a customer request — you decide.',
  },
  {
    icon: IconChartBar,
    title: 'Build a stronger local presence',
    description: 'Give your business a cleaner digital storefront inside a focused Riyadh marketplace.',
  },
];

export default function ForProsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader proLinks />

      <main>
        {/* Hero */}
        <section className="border-b border-slate-100 bg-white px-4 pb-24 pt-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                For Service Professionals
              </span>
              <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                Turn Riyadh search demand into booked work.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
                HandyCall gives service businesses a cleaner way to get discovered, organize incoming requests, and grow in a marketplace built around how homeowners actually search.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Pro Sign Up — Free
                </Link>
                <Link
                  href="/pro/login"
                  className="rounded-xl border border-slate-300 px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Pro Login
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                {BENEFITS.map((benefit) => (
                  <div key={benefit.title} className="rounded-2xl bg-white p-5 shadow-sm">
                    <benefit.icon className="h-6 w-6 text-emerald-600" stroke={1.8} />
                    <h2 className="mt-4 text-base font-bold text-slate-900">{benefit.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Pros Join */}
        <section className="px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Why Pros Join
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Built for businesses that want better local visibility
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <IconMapPin className="h-7 w-7 text-emerald-600" stroke={1.8} />
                <h3 className="mt-4 text-xl font-bold text-slate-900">District-based discovery</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Customers search by Riyadh neighborhoods and districts, which helps your business show up in a more relevant local context.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <IconBolt className="h-7 w-7 text-emerald-600" stroke={1.8} />
                <h3 className="mt-4 text-xl font-bold text-slate-900">Cleaner request flow</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  A simpler public experience means better-qualified search intent and a cleaner path into your pro account.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <IconChecklist className="h-7 w-7 text-emerald-600" stroke={1.8} />
                <h3 className="mt-4 text-xl font-bold text-slate-900">One place to grow</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Your public listing, incoming requests, onboarding, and business tools can all live inside the same HandyCall account.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Job Requests feature section */}
        <section className="border-t border-slate-100 bg-slate-50 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Direct from customers
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Customers can send you job requests directly
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-slate-500 text-base leading-relaxed">
                Homeowners describe their job, share their location, and send a request straight to pros in their area. You review the details, then decide whether to accept.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <IconFileText className="h-6 w-6 text-emerald-600" stroke={1.8} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Customer describes the job</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Customers fill in a short request — what they need, where they are, and when works for them. No vague calls, just structured intent.
                </p>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <IconChecklist className="h-6 w-6 text-emerald-600" stroke={1.8} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">You review and decide</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  The request lands in your Direct Requests inbox. You see the job description and district before making a decision — no commitment required.
                </p>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <IconMessage className="h-6 w-6 text-emerald-600" stroke={1.8} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">Accept to connect</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Accepting a request reveals the customer&apos;s full contact details and opens a direct chat — a lead fee applies when you accept. Decline at no cost.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <p className="text-lg font-bold text-slate-900">Only pay for the leads you want</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-xl mx-auto">
                There&apos;s no monthly subscription fee. A lead fee is charged only when you choose to accept a customer job request. You are always in control.
              </p>
              <Link
                href="/register"
                className="mt-6 inline-block rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Join HandyCall — Free
              </Link>
            </div>
          </div>
        </section>

        {/* Simple pricing model */}
        <section id="pricing" className="border-t border-slate-100 bg-white px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
              Pricing
            </span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
              Free to join. Pay only when you win.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              Creating your HandyCall pro profile is completely free. There are no monthly fees or subscriptions. A lead fee is charged only when you accept a customer&apos;s job request — so you only pay for opportunities you actually want to pursue.
            </p>

            <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-left shadow-sm">
              <ul className="space-y-5">
                {[
                  { label: 'Create your pro profile', sub: 'Set up your listing, service categories, and district coverage at no cost.' },
                  { label: 'Appear in search results', sub: 'Customers searching in your area can find and browse your profile for free.' },
                  { label: 'Review incoming job requests', sub: 'See the job description and location before you commit — reviewing is always free.' },
                  { label: 'Accept to reveal contact details', sub: 'When you accept a request, a lead fee applies and you gain full access to the customer\'s details and a direct chat.' },
                  { label: 'Decline at no cost', sub: 'Not the right fit? Decline the request for free — no charge ever.' },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <IconCheck className="h-3.5 w-3.5 text-emerald-600" stroke={2.5} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{item.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Create your free profile
              </Link>
              <Link
                href="/pro/login"
                className="rounded-xl border border-slate-300 px-8 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Pro Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
