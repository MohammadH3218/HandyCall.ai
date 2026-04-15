'use client';

import Link from 'next/link';
import { useState } from 'react';
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
import { FEATURED_MARKETPLACE_CATEGORIES } from '@/constants/marketplace-service-categories';

/**
 * High-quality Unsplash photos keyed by category slug.
 * Using direct photo IDs for stable, reliable URLs.
 */
const CATEGORY_PHOTOS: Record<string, string> = {
  'ac-repair':       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&q=82&fit=crop&auto=format',
  'plumbing':        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=260&q=82&fit=crop&auto=format',
  'electrical':      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=260&q=82&fit=crop&auto=format',
  'cleaning':        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=260&q=82&fit=crop&auto=format',
  'painting':        'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=260&q=82&fit=crop&auto=format',
  'carpentry':       'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=260&q=82&fit=crop&auto=format',
  'pest-control':    'https://images.unsplash.com/photo-1580974852861-7a9b3f5be2b7?w=400&h=260&q=82&fit=crop&auto=format',
  'landscaping':     'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=260&q=82&fit=crop&auto=format',
  'appliance-repair':'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&h=260&q=82&fit=crop&auto=format',
  'moving':          'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&h=260&q=82&fit=crop&auto=format',
  'handyman':        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=260&q=82&fit=crop&auto=format',
  'network-it':      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=260&q=82&fit=crop&auto=format',
};

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

/** Auto-scrolling category carousel with real photos — pauses on hover */
function CategoryCarousel() {
  const [paused, setPaused] = useState(false);

  // Duplicate for seamless infinite loop (animate 0 → -50%)
  const items = [...FEATURED_MARKETPLACE_CATEGORIES, ...FEATURED_MARKETPLACE_CATEGORIES];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-4 py-2"
        style={{
          animation: 'hc-carousel-scroll 32s linear infinite',
          animationPlayState: paused ? 'paused' : 'running',
          width: 'max-content',
        }}
      >
        {items.map((category, index) => {
          const photoSrc = CATEGORY_PHOTOS[category.slug];
          return (
            <Link
              key={`${category.slug}-${index}`}
              href={`/search?category=${encodeURIComponent(category.slug)}`}
              className="group flex w-[160px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
            >
              {/* Photo area */}
              <div className="relative h-[120px] w-full overflow-hidden bg-slate-100">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc}
                    alt={category.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-full w-full bg-slate-200" />
                )}
                {/* Subtle dark overlay on hover */}
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
              </div>

              {/* Label */}
              <div className="px-3 py-3 text-center">
                <p className="text-sm font-bold leading-snug text-slate-800 transition-colors duration-200 group-hover:text-emerald-700">
                  {category.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

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
        @keyframes hc-carousel-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      <SiteHeader />

      {/* Hero */}
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

      {/* Categories — auto-scroll carousel */}
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

          <FadeIn direction="up" delay={80}>
            <CategoryCarousel />
          </FadeIn>

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

      {/* How It Works */}
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
                  {/* Darkened from text-emerald-100 (near invisible) to text-slate-300 */}
                  <span className="text-5xl font-black leading-none text-slate-300">
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

      {/* Why HandyCall */}
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

      {/* For Pros CTA */}
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
