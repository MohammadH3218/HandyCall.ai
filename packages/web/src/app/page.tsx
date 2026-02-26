import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import {
  IconDroplet,
  IconWind,
  IconBolt,
  IconBug,
  IconSparkles,
  IconTree,
  IconHome,
  IconPaint,
  IconSearch,
  IconCalendar,
  IconCircleCheck,
  IconArrowRight,
  IconShield,
  IconStar,
  IconUsers,
  IconMapPin,
} from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'HandyCall — Find & Book Trusted Home Service Pros',
  description:
    'Find local plumbers, electricians, HVAC techs, cleaners, and more near you. Compare providers, book quickly, and pay securely.',
  openGraph: {
    title: 'HandyCall — Home Services Marketplace',
    description: 'Book local pros for home services with clear scheduling and secure payments.',
    url: '/',
  },
};

const categories = [
  { name: 'Plumbing', icon: IconDroplet, slug: 'plumbing' },
  { name: 'HVAC', icon: IconWind, slug: 'hvac' },
  { name: 'Electrical', icon: IconBolt, slug: 'electrical' },
  { name: 'Pest Control', icon: IconBug, slug: 'pest-control' },
  { name: 'Cleaning', icon: IconSparkles, slug: 'cleaning' },
  { name: 'Landscaping', icon: IconTree, slug: 'landscaping' },
  { name: 'Roofing', icon: IconHome, slug: 'roofing' },
  { name: 'Painting', icon: IconPaint, slug: 'painting' },
];

const steps = [
  {
    num: '1',
    title: 'Describe your project',
    desc: 'Tell us what service you need and where — we match you with local, verified pros.',
    icon: IconSearch,
  },
  {
    num: '2',
    title: 'Get matched instantly',
    desc: 'Browse profiles, reviews, and pricing. Request quotes or book directly.',
    icon: IconCalendar,
  },
  {
    num: '3',
    title: 'Job done, pay securely',
    desc: 'Your pro arrives, completes the work, and you pay safely through HandyCall.',
    icon: IconCircleCheck,
  },
];

const trustBadges = [
  { label: 'Background checked', icon: IconShield },
  { label: 'Verified reviews', icon: IconStar },
  { label: 'Insured pros', icon: IconUsers },
  { label: 'Service guarantee', icon: IconCircleCheck },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-white pt-16 pb-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Home improvement,<br className="hidden sm:block" />{' '}
              <span className="text-emerald-600">made easy.</span>
            </h1>
            <p className="mt-5 text-xl text-slate-500 max-w-xl mx-auto">
              Find trusted local pros for any project — plumbing, electrical, cleaning, and more.
            </p>

            {/* Search bar */}
            <div className="mt-10 mx-auto max-w-2xl">
              <div className="flex flex-col sm:flex-row gap-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="relative flex-1 border-b sm:border-b-0 sm:border-r border-slate-200">
                  <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" stroke={1.5} />
                  <input
                    type="text"
                    placeholder="Describe your project or problem"
                    className="w-full py-4 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>
                <div className="relative sm:w-52">
                  <IconMapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" stroke={1.5} />
                  <input
                    type="text"
                    placeholder="ZIP or city"
                    className="w-full py-4 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>
                <Link
                  href="/find-pros"
                  className="bg-emerald-600 px-8 py-4 text-sm font-semibold text-white hover:bg-emerald-700 transition whitespace-nowrap text-center"
                >
                  Search
                </Link>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-sm text-slate-500">
                  <b.icon className="h-4 w-4 text-emerald-500" stroke={1.5} />
                  {b.label}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="border-t border-slate-100 py-14 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Pros for every project
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/categories/${cat.slug}`}
                  className="group flex flex-col items-center gap-2 py-4 px-2 text-center rounded-xl hover:bg-slate-50 transition"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white group-hover:border-emerald-300 transition">
                    <cat.icon className="h-6 w-6 text-slate-600 group-hover:text-emerald-600 transition" stroke={1.5} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 leading-tight">{cat.name}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/categories"
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View all categories <IconArrowRight className="h-4 w-4" stroke={2} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="border-t border-slate-100 py-16 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4">
          <FadeIn>
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                How it works
              </h2>
              <p className="mt-1 text-slate-500">Get the help you need in three steps.</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.num} className="relative">
                  {i < steps.length - 1 && (
                    <div className="absolute top-5 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-2rem)] bg-slate-200 sm:block" />
                  )}
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-sm font-bold text-slate-900">
                    {s.num}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Pro CTA strip ─────────────────────────────────────── */}
      <section className="border-t border-slate-100 py-12 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-slate-200 px-8 py-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">For professionals</p>
                <h2 className="text-xl font-bold text-slate-900">
                  Grow your service business with HandyCall
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  AI call answering, automated booking, and more. Join 500+ local pros.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  href="/pros"
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition text-center"
                >
                  Join as a Pro
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
                >
                  Pro Login
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
