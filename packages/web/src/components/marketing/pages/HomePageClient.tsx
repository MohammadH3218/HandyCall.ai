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

// ---------------------------------------------------------------------------
// Category data for the marquee (duplicated in JSX for seamless infinite loop)
// ---------------------------------------------------------------------------
const MARQUEE_CATEGORIES = [
  { en: 'AC Repair',       ar: 'تصليح المكيفات', q: 'AC Repair',      img: 'https://images.pexels.com/photos/5691628/pexels-photo-5691628.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { en: 'Plumbing',        ar: 'السباكة',         q: 'Plumbing',       img: 'https://images.pexels.com/photos/8486972/pexels-photo-8486972.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { en: 'House Cleaning',  ar: 'تنظيف المنازل',   q: 'House Cleaning', img: 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { en: 'Electrical',      ar: 'الكهرباء',         q: 'Electrical',     img: 'https://images.pexels.com/photos/8961300/pexels-photo-8961300.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { en: 'Painting',        ar: 'الدهان',            q: 'Painting',       img: 'https://images.pexels.com/photos/6474475/pexels-photo-6474475.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { en: 'Carpentry',       ar: 'النجارة',           q: 'Carpentry',      img: 'https://images.pexels.com/photos/5974304/pexels-photo-5974304.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { en: 'Pest Control',    ar: 'مكافحة الحشرات',   q: 'Pest Control',   img: 'https://images.pexels.com/photos/6197124/pexels-photo-6197124.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { en: 'Landscaping',     ar: 'تنسيق الحدائق',    q: 'Landscaping',    img: 'https://images.pexels.com/photos/589/garden-grass-lawn-green.jpg?auto=compress&cs=tinysrgb&w=1200' },
];

const POPULAR_SEARCHES = [
  'Split AC not cooling',
  'Pipe leak under sink',
  'Deep cleaning before guests',
  'Kitchen lights stopped working',
];

const STEPS = [
  {
    num: '01',
    title: 'Search by service and district',
    description:
      'Describe the job in plain language and narrow results by Riyadh district so nearby pros show up first.',
  },
  {
    num: '02',
    title: 'Compare real public profiles',
    description:
      'Review photos, pricing, reviews, and service details before you decide who to contact.',
  },
  {
    num: '03',
    title: 'Send a request when ready',
    description:
      'Reach out only when you are ready to move forward instead of signing up before you can browse.',
  },
];

const TRUST_POINTS = [
  {
    icon: IconShieldCheck,
    title: 'Built for real Riyadh service searches',
    description:
      'The search flow is shaped around how homeowners actually look for AC, plumbing, cleaning, and repair jobs.',
  },
  {
    icon: IconMapPin,
    title: 'District-first matching',
    description:
      'Search by neighborhood so results reflect where the pro actually works, not just a broad city match.',
  },
  {
    icon: IconStar,
    title: 'Profiles customers can actually judge',
    description:
      'See photos, pricing, reviews, and public service details before deciding who deserves your request.',
  },
];

// ---------------------------------------------------------------------------
// Category card used inside the infinite marquee
// ---------------------------------------------------------------------------
function CategoryCard({ en, ar, q, img }: { en: string; ar: string; q: string; img: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(q)}`}
      className="group relative h-44 w-[260px] shrink-0 overflow-hidden rounded-[28px] border border-white/70 bg-slate-200 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={en}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-lg font-bold tracking-tight">{en}</p>
        <p className="mt-1 text-sm text-white/85" dir="rtl" lang="ar">
          {ar}
        </p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function HomePageClient() {
  // Duplicate categories for seamless infinite marquee
  const marqueeItems = [...MARQUEE_CATEGORIES, ...MARQUEE_CATEGORIES];

  return (
    <div className="flex min-h-screen flex-col bg-[#f7faf8]">
      <style>{`
        @keyframes hc-hero-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes hc-marquee-rtl {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .hc-hero-highlight {
          background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: hc-hero-shimmer 3.5s linear infinite;
        }
        .hc-marquee-track {
          width: max-content;
          animation: hc-marquee-rtl 34s linear infinite;
          will-change: transform;
        }
        .hc-marquee-shell:hover .hc-marquee-track {
          animation-play-state: paused;
        }
      `}</style>

      <SiteHeader />

      {/* ─── Hero + Search + Popular searches + Category marquee ─── */}
      <section className="relative overflow-hidden bg-white px-4 pb-10 pt-16 sm:pb-14 sm:pt-20">
        {/* Subtle radial glow + gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.14), transparent 46%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,250,248,1))',
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          {/* Headline */}
          <FadeIn direction="up" duration={700}>
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                Riyadh Home Services
              </span>
              <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Find the right pro
                <span className="hc-hero-highlight"> before you waste time.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-500 sm:text-xl">
                Search by service and Riyadh district, compare real public profiles, and only sign
                up when you are ready to send a request.
              </p>
            </div>
          </FadeIn>

          {/* Search bar */}
          <FadeIn direction="up" delay={120} duration={700}>
            <div className="mx-auto mt-10 max-w-5xl">
              <SearchBar className="shadow-md" size="lg" />
            </div>
          </FadeIn>

          {/* Popular searches */}
          <FadeIn direction="up" delay={180} duration={700}>
            <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-2 text-sm text-slate-400">
              <span className="font-semibold text-slate-500">Popular searches:</span>
              {POPULAR_SEARCHES.map((q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {q}
                </Link>
              ))}
            </div>
          </FadeIn>

          {/* Category marquee */}
          <FadeIn direction="up" delay={250} duration={750}>
            <div className="mt-14">
              <div className="mb-5 flex flex-col items-center text-center">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                  Explore Popular Categories
                </span>
                <p className="mt-2 text-sm text-slate-500">
                  Scroll through real job categories customers search every day.
                </p>
              </div>

              <div className="hc-marquee-shell relative overflow-hidden rounded-[34px] bg-transparent py-2">
                {/* Fade masks */}
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white via-white/80 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white via-white/80 to-transparent" />

                <div className="hc-marquee-track flex gap-5">
                  {marqueeItems.map((cat, idx) => (
                    <CategoryCard key={`${cat.q}-${idx}`} {...cat} />
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="border-t border-slate-100 bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up" duration={600}>
            <div className="mb-14 text-center">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                How It Works
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                Search first, decide later
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <FadeIn key={step.num} direction="up" duration={600} delay={index * 120}>
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <span className="text-5xl font-black leading-none text-emerald-100">
                    {step.num}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why This Search Experience ─── */}
      <section className="border-t border-slate-100 bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up" duration={600}>
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Why this search experience feels better
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TRUST_POINTS.map((item, index) => (
              <FadeIn key={item.title} direction="up" duration={600} delay={index * 80}>
                <div className="rounded-[28px] border border-slate-200 bg-[#f7faf8] p-6 shadow-sm">
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

      {/* ─── For Pros CTA ─── */}
      <section className="bg-slate-900 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn direction="up" duration={600}>
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-lg">
              <IconChecklist className="h-5 w-5 text-emerald-600" stroke={1.8} />
              <span className="text-sm font-semibold text-slate-700">
                Explore categories visually, search by district, and send requests only when you are
                ready to move forward.
              </span>
            </div>

            <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-white">
              Looking to grow your service business?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
              HandyCall helps pros get discovered, manage requests, and turn search traffic into
              booked jobs.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/for-pros"
                className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-md transition hover:bg-slate-50"
              >
                Explore For Pros
              </Link>
              <Link
                href="/register?audience=pro"
                className="rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Pro Sign Up
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
