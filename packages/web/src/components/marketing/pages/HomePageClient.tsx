'use client';

import Link from 'next/link';
import {
  IconChecklist,
  IconMapPin,
  IconShieldCheck,
  IconStar,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import { SearchBar } from '@/components/marketing/SearchBar';
import { CategoryCard } from '@/components/marketing/CategoryCard';
import { FEATURED_MARKETPLACE_CATEGORIES } from '@/constants/marketplace-service-categories';

const STEPS = [
  {
    num: '01',
    title: 'Search by service and Riyadh district',
    description:
      'Choose the service you need and the part of Riyadh you are in so you can narrow down the right local providers faster.',
  },
  {
    num: '02',
    title: 'Review the best matches',
    description:
      'Compare profiles, ratings, categories, and availability details before deciding who to contact.',
  },
  {
    num: '03',
    title: 'Create an account when you are ready',
    description:
      'Browse first, then sign up only when you want to save your requests, bookings, and account history.',
  },
];

const TRUST_POINTS = [
  {
    icon: IconShieldCheck,
    title: 'Structured around real home-service jobs',
    description: 'Built specifically for the work Riyadh homeowners search for most.',
  },
  {
    icon: IconMapPin,
    title: 'Focused on Riyadh districts',
    description: 'Search by neighborhood instead of broad city-level results.',
  },
  {
    icon: IconStar,
    title: 'Clear categories and cleaner browsing',
    description: 'A simpler path to the service you need without fake listings or filler content.',
  },
];

export function HomePageClient() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <style>{`
        @keyframes hc-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hc-shimmer-text {
          background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: hc-shimmer 3s linear infinite;
          display: inline;
        }
      `}</style>

      <SiteHeader />

      <section className="relative z-10 overflow-visible bg-white px-4 pb-28 pt-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16,185,129,0.09) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <FadeIn direction="up" duration={700}>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Find home services,
              <span className="hc-shimmer-text"> faster.</span>
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-slate-500">
              Search by service and Riyadh district to find the right provider faster.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={150} duration={700}>
            <SearchBar className="mt-10 shadow-md" size="lg" />
          </FadeIn>
        </div>
      </section>

      <section className="relative z-0 bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn direction="up">
            <div className="mb-10 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Browse Categories
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Services homeowners use every week
              </h2>
              <p className="mt-3 text-slate-500">
                Browse the most requested categories first, then narrow by district on the search page.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {FEATURED_MARKETPLACE_CATEGORIES.map((category, index) => (
              <FadeIn key={category.slug} direction="up" delay={index * 40}>
                <CategoryCard
                  nameEn={category.title}
                  nameAr={category.titleAr}
                  slug={category.slug}
                  showCount={false}
                />
              </FadeIn>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Browse all categories
            </Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-100 bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-14 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                How It Works
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                A cleaner way to search Riyadh services
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <FadeIn key={step.num} direction="up" delay={index * 120}>
                <div className="flex flex-col">
                  <span className="text-5xl font-black leading-none text-emerald-100">
                    {step.num}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Why homeowners choose HandyCall
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TRUST_POINTS.map((item, index) => (
              <FadeIn key={item.title} direction="up" delay={index * 80}>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <item.icon className="h-7 w-7 text-emerald-600" stroke={1.8} />
                  <h3 className="mt-4 font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-600 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn direction="up">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-lg">
              <IconChecklist className="h-5 w-5 text-emerald-600" stroke={1.8} />
              <span className="text-sm font-semibold text-slate-700">
                Browse categories, search by district, and sign up only when you want to save progress.
              </span>
            </div>

            <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-white">
              Looking to grow your service business?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-emerald-100">
              Visit the For Pros page to see how HandyCall helps providers get discovered, manage requests, and turn marketplace traffic into booked jobs.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/for-pros"
                className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-md transition hover:bg-slate-50"
              >
                Explore For Pros
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign Up
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
