'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  IconArrowRight,
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

const CATEGORY_PHOTOS: Record<string, string> = {
  'ac-repair':
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=260&q=82&fit=crop&auto=format',
  plumbing:
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=260&q=82&fit=crop&auto=format',
  electrical:
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=260&q=82&fit=crop&auto=format',
  cleaning:
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=260&q=82&fit=crop&auto=format',
  painting: '/images/categories/painting.avif',
  carpentry:
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=260&q=82&fit=crop&auto=format',
  'pest-control': '/images/categories/pest-control.webp',
  landscaping:
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=260&q=82&fit=crop&auto=format',
  'appliance-repair':
    'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&h=260&q=82&fit=crop&auto=format',
  moving:
    'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&h=260&q=82&fit=crop&auto=format',
  handyman:
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=260&q=82&fit=crop&auto=format',
  'network-it':
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=260&q=82&fit=crop&auto=format',
};

const STEPS = [
  {
    num: '01',
    title: 'Search by service and district',
    description:
      'Choose the service you need and the part of Riyadh you are in to narrow down the right local providers faster.',
  },
  {
    num: '02',
    title: 'Review the best matches',
    description:
      'Compare profiles, ratings, categories, and availability details before deciding who to contact.',
  },
  {
    num: '03',
    title: 'Create an account when ready',
    description:
      'Browse first, then sign up only when you want to save your requests, bookings, and account history.',
  },
];

const TRUST_POINTS = [
  {
    icon: IconShieldCheck,
    title: 'Built for real home-service jobs',
    description: 'Structured specifically for the work Riyadh homeowners search for most.',
  },
  {
    icon: IconMapPin,
    title: 'Focused on Riyadh districts',
    description: 'Search by neighborhood instead of broad city-level results.',
  },
  {
    icon: IconStar,
    title: 'Clear categories, cleaner browsing',
    description: 'A simpler path to the service you need without fake listings or filler.',
  },
];

function CategoryCarousel() {
  const [paused, setPaused] = useState(false);
  const items = [...FEATURED_MARKETPLACE_CATEGORIES, ...FEATURED_MARKETPLACE_CATEGORIES];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-3 py-2"
        style={{
          animation: 'hc-carousel-scroll 36s linear infinite',
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
              className="group flex w-[156px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="relative h-[108px] w-full overflow-hidden bg-slate-100">
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
                  <div className="h-full w-full bg-slate-100" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs font-semibold leading-snug text-slate-700 transition-colors duration-200 group-hover:text-emerald-700">
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
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .hc-shimmer-text {
          background: linear-gradient(90deg, #059669, #10b981, #34d399, #10b981, #059669);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: hc-shimmer 3.5s linear infinite;
          display: inline;
        }
        @keyframes hc-carousel-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .hero-grid {
          background-image:
            linear-gradient(rgba(16,185,129,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.055) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      <SiteHeader />

      {/* ── Hero ── */}
      <section className="hero-grid relative z-10 overflow-hidden bg-white px-4 pb-28 pt-20">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-[320px] w-[320px] rounded-full bg-emerald-300/8 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn direction="up" duration={700}>
            {/* Eyebrow */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold tracking-wide text-emerald-700">
                Riyadh's home services marketplace
              </span>
            </div>

            <h1 className="font-serif text-5xl font-bold italic leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-[4.5rem]">
              Find home services,
              <br />
              <span className="hc-shimmer-text not-italic">faster.</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-500 sm:text-xl">
              Search by service and Riyadh district to find the right provider faster.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={150} duration={700}>
            <div className="mt-10">
              <SearchBar className="shadow-lg shadow-slate-200/60" size="lg" />
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Free to browse · No account needed to search
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Categories carousel ── */}
      <section className="border-t border-slate-100 bg-slate-50/70 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn direction="up">
            <div className="mb-10 flex flex-col items-center gap-3 text-center">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                Browse Categories
              </span>
              <h2 className="font-serif text-3xl font-bold italic text-slate-900 sm:text-4xl">
                Services homeowners use every week
              </h2>
              <p className="max-w-md text-sm text-slate-500">
                Browse the most requested categories, then narrow by district on the search page.
              </p>
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={80}>
            <CategoryCarousel />
          </FadeIn>

          <div className="mt-8 text-center">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 hover:shadow"
            >
              View all services
              <IconArrowRight className="h-4 w-4" stroke={1.8} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="border-t border-slate-100 bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-16 flex flex-col items-center gap-3 text-center">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                How It Works
              </span>
              <h2 className="font-serif text-3xl font-bold italic text-slate-900 sm:text-4xl">
                A cleaner way to find services in Riyadh
              </h2>
            </div>
          </FadeIn>

          <div className="relative grid grid-cols-1 gap-0 sm:grid-cols-3">
            {/* Connector line on desktop */}
            <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[2.25rem] hidden h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent sm:block" />

            {STEPS.map((step, index) => (
              <FadeIn key={step.num} direction="up" delay={index * 100}>
                <div className="group relative flex flex-col items-start px-6 py-8 sm:items-center sm:text-center">
                  {/* Step circle */}
                  <div className="relative mb-5 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-2 border-emerald-100 bg-white shadow-sm transition-all duration-300 group-hover:border-emerald-300 group-hover:shadow-md">
                    <span className="font-mono text-sm font-bold text-emerald-600">{step.num}</span>
                  </div>
                  <h3 className="text-base font-bold leading-snug text-slate-900">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-500">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why HandyCall ── */}
      <section className="border-t border-slate-100 bg-slate-50/70 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-12 flex flex-col items-center gap-3 text-center">
              <h2 className="font-serif text-3xl font-bold italic text-slate-900 sm:text-4xl">
                Why homeowners choose HandyCall
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TRUST_POINTS.map((item, index) => (
              <FadeIn key={item.title} direction="up" delay={index * 80}>
                <div className="group rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 transition-colors duration-300 group-hover:bg-emerald-100">
                    <item.icon className="h-5 w-5 text-emerald-600" stroke={1.8} />
                  </div>
                  <h3 className="font-bold leading-snug text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Pros CTA ── */}
      <section className="relative overflow-hidden border-t border-slate-200 bg-slate-950 px-4 py-24">
        {/* Background accent */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-950/40 to-transparent" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn direction="up">
            {/* Info chip */}
            <div className="mx-auto mb-8 inline-flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
              <IconChecklist className="h-4 w-4 text-emerald-400" stroke={1.8} />
              <span className="text-sm text-slate-300">
                Browse categories, search by district, and sign up only when you&apos;re ready.
              </span>
            </div>

            <h2 className="font-serif text-4xl font-bold italic text-white sm:text-5xl">
              Looking to grow your service business?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400">
              Visit the For Pros page to see how HandyCall helps providers get discovered, manage
              requests, and turn marketplace traffic into booked jobs.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/for-pros"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400"
              >
                Explore For Pros
                <IconArrowRight className="h-4 w-4" stroke={2} />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Sign Up Free
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
