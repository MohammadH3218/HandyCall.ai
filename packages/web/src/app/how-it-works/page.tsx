import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Search, Star, CalendarCheck, CreditCard, ShieldCheck, MessageSquare, Clock, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works — Book Home Services in 4 Simple Steps',
  description:
    'Learn how HandyCall makes it easy to find, compare, book, and pay for trusted local home service professionals. Start in under 2 minutes.',
  openGraph: {
    title: 'How HandyCall Works',
    description:
      'Find vetted pros, read real reviews, book instantly, and pay securely after the job is done.',
  },
};

const steps = [
  {
    number: '01',
    title: 'Search & Discover',
    description: 'Enter what service you need and your location. Browse verified pros with real reviews, ratings, and photos. Filter by availability, price range, and specialization.',
    icon: Search,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    number: '02',
    title: 'Read Reviews & Compare',
    description: 'Every pro has genuine reviews from verified customers. See ratings, past work, response times, and pricing. Choose the right fit for your job with confidence.',
    icon: Star,
    color: 'bg-amber-50 text-amber-500',
  },
  {
    number: '03',
    title: 'Book in Minutes',
    description: 'Select a time that works for you and confirm your appointment. Get instant booking confirmation with everything you need — no back-and-forth phone tag.',
    icon: CalendarCheck,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    number: '04',
    title: 'Pay Securely',
    description: 'Pay safely through HandyCall after the job is done. No cash required. Your payment is held until you confirm the work is complete to your satisfaction.',
    icon: CreditCard,
    color: 'bg-violet-50 text-violet-600',
  },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Background Checks',
    description: 'Every pro passes a thorough background check before joining the platform.',
  },
  {
    icon: Star,
    title: 'Verified Reviews',
    description: 'All reviews come from real, completed jobs — never fake or unverified.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Communication',
    description: 'Message your pro through the app before, during, and after the job.',
  },
  {
    icon: Clock,
    title: 'On-Time Guarantee',
    description: 'If your pro is more than 15 minutes late, we'll work to make it right.',
  },
];

const faqs = [
  {
    q: 'Is HandyCall free to use for customers?',
    a: 'Yes — browsing, searching, and requesting quotes is completely free for homeowners. You only pay for the services you book.',
  },
  {
    q: 'How are pros verified?',
    a: 'All service pros go through identity verification, license checks (where applicable), background checks, and review screening before appearing on HandyCall.',
  },
  {
    q: 'What if I\'m not happy with the work?',
    a: 'Your payment is held until you confirm the job is done. If there\'s an issue, our support team will help resolve it — including re-booking or refunds when appropriate.',
  },
  {
    q: 'Can I reschedule or cancel?',
    a: 'Yes. You can reschedule or cancel through your account portal. Cancellation policies vary by pro, so check before booking.',
  },
  {
    q: 'How do I pay?',
    a: 'We accept all major credit and debit cards, processed securely through Stripe. You\'re only charged after the job is completed.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 py-16 text-center">
          <div className="mx-auto max-w-2xl px-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              How HandyCall Works
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Finding and booking trusted home service pros is simple, fast, and safe.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4">
            <div className="space-y-10">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isEven = index % 2 === 1;
                return (
                  <div
                    key={step.number}
                    className={`flex flex-col gap-6 sm:flex-row sm:items-center ${isEven ? 'sm:flex-row-reverse' : ''}`}
                  >
                    <div className="flex-1 space-y-2">
                      <p className="text-5xl font-black text-slate-100">{step.number}</p>
                      <h2 className="text-2xl font-bold text-slate-900 -mt-6">{step.title}</h2>
                      <p className="text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                    <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl shadow-md ${step.color}`}>
                      <Icon className="h-12 w-12" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Built on trust</h2>
              <p className="mt-2 text-slate-600">Every step is designed to keep you protected.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-center">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                        <Icon className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900">{point.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{point.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Frequently asked questions</h2>
            <div className="space-y-5">
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-slate-900">{faq.q}</h3>
                      <p className="mt-1 text-sm text-slate-600">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-emerald-600 py-14 text-center">
          <div className="mx-auto max-w-xl px-4">
            <h2 className="text-2xl font-bold text-white">Ready to find your pro?</h2>
            <p className="mt-2 text-emerald-100">
              Browse thousands of vetted professionals and book in under 2 minutes.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/find-pros"
                className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
              >
                Find a Pro Now
              </Link>
              <Link
                href="/categories"
                className="rounded-xl border border-emerald-400 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
