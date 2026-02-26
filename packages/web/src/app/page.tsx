import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import {
  Search,
  CheckCircle2,
  Star,
  Wrench,
  Wind,
  Zap,
  Bug,
  Sparkles,
  TreePine,
  Home,
  Paintbrush,
  ArrowRight,
  Phone,
  CalendarCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────── */

const categories = [
  { name: 'Plumbing', icon: Wrench, color: 'bg-blue-50 text-blue-600' },
  { name: 'HVAC', icon: Wind, color: 'bg-sky-50 text-sky-600' },
  { name: 'Electrical', icon: Zap, color: 'bg-yellow-50 text-yellow-600' },
  { name: 'Pest Control', icon: Bug, color: 'bg-orange-50 text-orange-600' },
  { name: 'Cleaning', icon: Sparkles, color: 'bg-violet-50 text-violet-600' },
  { name: 'Landscaping', icon: TreePine, color: 'bg-emerald-50 text-emerald-600' },
  { name: 'Roofing', icon: Home, color: 'bg-red-50 text-red-600' },
  { name: 'Painting', icon: Paintbrush, color: 'bg-pink-50 text-pink-600' },
];

const steps = [
  {
    step: '01',
    title: 'Search',
    desc: 'Enter your location and the service you need to find verified pros near you.',
    icon: Search,
  },
  {
    step: '02',
    title: 'Book',
    desc: 'Choose a provider, pick a time that works, and confirm your appointment instantly.',
    icon: CalendarCheck,
  },
  {
    step: '03',
    title: 'Done',
    desc: 'Your pro arrives on time, completes the job, and you pay securely through the app.',
    icon: CheckCircle2,
  },
];

const trustBadges = [
  { value: '10,000+', label: 'Verified Pros', icon: Users },
  { value: '100%', label: 'Background Checked', icon: ShieldCheck },
  { value: '4.8★', label: 'Average Rating', icon: Star },
];

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50 pt-20 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <FadeIn>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified & insured pros — instant booking
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Find Trusted{' '}
              <span className="text-emerald-600">Home Service Pros</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
              Connect with background-checked, top-rated local professionals for
              plumbing, HVAC, electrical, and dozens of other home services — all
              bookable in minutes.
            </p>

            {/* Search bar */}
            <div className="mt-8 mx-auto max-w-2xl">
              <div className="flex flex-col sm:flex-row gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="What service do you need?"
                    className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Your city or zip code"
                    className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <Link
                  href="/find-pros"
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition whitespace-nowrap"
                >
                  Find Pros
                </Link>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {trustBadges.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="flex items-center gap-2 text-sm text-slate-600">
                    <Icon className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-slate-900">{b.value}</span>
                    {b.label}
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Browse by service category
              </h2>
              <p className="mt-2 text-slate-500">
                Find the right professional for any home service need.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.name}
                    href={`/find-pros?category=${encodeURIComponent(cat.name)}`}
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm hover:border-emerald-200 hover:shadow-md transition"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.color} transition group-hover:scale-110`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/find-pros"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Browse all services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                How HandyCall works
              </h2>
              <p className="mt-2 text-slate-500">Book a trusted pro in three simple steps.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="relative flex flex-col items-center text-center">
                    {i < steps.length - 1 && (
                      <div className="absolute top-6 left-[calc(50%+2rem)] hidden h-0.5 w-[calc(100%-4rem)] bg-emerald-100 sm:block" />
                    )}
                    <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-md">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="mb-1 text-xs font-bold text-emerald-500 tracking-widest">STEP {s.step}</div>
                    <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-500 max-w-xs">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Pro CTA ──────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-4">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-12 text-white shadow-xl">
              <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative z-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    <Phone className="h-3.5 w-3.5" /> For Home Service Pros
                  </div>
                  <h2 className="text-2xl font-bold sm:text-3xl">
                    Are you a home service professional?
                  </h2>
                  <p className="mt-2 text-emerald-100 max-w-lg">
                    Join thousands of pros who use HandyCall to manage bookings, capture missed
                    calls with AI, and grow their business.
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-3 text-sm">
                    {['AI call answering', 'Online booking', 'Payment processing', 'Customer management'].map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-200" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2 sm:shrink-0">
                  <Link
                    href="/sign-up"
                    className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition text-center"
                  >
                    Get started free
                  </Link>
                  <Link
                    href="/sign-in"
                    className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition text-center"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
