'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import { SearchBar } from '@/components/marketing/SearchBar';
import { CategoryCard } from '@/components/marketing/CategoryCard';
import { FEATURED_MARKETPLACE_CATEGORIES } from '@/constants/marketplace-service-categories';
import {
  IconHeadset,
  IconBellRinging,
  IconCalendarEvent,
  IconCreditCard,
} from '@tabler/icons-react';

const POPULAR_TAGS = {
  en: ['AC Repair', 'House Cleaning', 'Plumbing', 'Electrical', 'Handyman', 'Pest Control', 'Painting', 'Appliance Repair'],
  ar: ['تصليح المكيفات', 'تنظيف المنازل', 'السباكة', 'إصلاح الأجهزة', 'الكهرباء', 'مكافحة الحشرات', 'الدهان', 'النقل'],
};

const STEPS = [
  {
    num: '01',
    title: { en: 'Search for a service', ar: 'ابحث عن الخدمة' },
    description: {
      en: 'Tell us what you need and your Houston-area neighborhood or zip code. Browse local pros by service category.',
      ar: 'أخبرنا بالخدمة التي تحتاجها والرمز البريدي، ثم تصفح المحترفين حسب الفئة في منطقتك.',
    },
  },
  {
    num: '02',
    title: { en: 'Compare and choose', ar: 'قارن واختر' },
    description: {
      en: 'Read verified reviews, compare prices, and message pros before you commit to anything.',
      ar: 'اطلع على التقييمات الموثقة، وقارن الأسعار، وتواصل مع المحترفين قبل تأكيد الحجز.',
    },
  },
  {
    num: '03',
    title: { en: 'Book and relax', ar: 'احجز واسترح' },
    description: {
      en: 'Pick your time slot, confirm your booking, and leave the rest to your Houston-area professional.',
      ar: 'اختر الموعد المناسب، وأكد الحجز، واترك الباقي للمحترف الذي اخترته.',
    },
  },
];

const PRO_PERKS = [
  { icon: <IconHeadset className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'AI-powered call handling', ar: 'إدارة المكالمات بالذكاء الاصطناعي' } },
  { icon: <IconBellRinging className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'Instant booking alerts', ar: 'تنبيهات فورية للحجوزات' } },
  { icon: <IconCalendarEvent className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'Built-in CRM & scheduling', ar: 'إدارة عملاء وجدولة مدمجة' } },
  { icon: <IconCreditCard className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'Secure payments', ar: 'مدفوعات آمنة' } },
];

const SERVICE_PHOTOS = [
  {
    src: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop&q=80',
    alt: 'Electrician working',
    label: { en: 'Electrical', ar: 'كهرباء' },
  },
  {
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&q=80',
    alt: 'AC technician',
    label: { en: 'AC & HVAC', ar: 'تكييف وتبريد' },
  },
  {
    src: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop&q=80',
    alt: 'House cleaning professional',
    label: { en: 'House Cleaning', ar: 'تنظيف منازل' },
  },
  {
    src: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop&q=80',
    alt: 'Plumber at work',
    label: { en: 'Plumbing', ar: 'سباكة' },
  },
];

export function HomePageClient() {
  const isArabic = false;
  const language = 'en';

  const copy = isArabic
    ? {
        badge: 'منصة خدمات المنازل',
        title: 'خدمات المنزل، بكل سهولة.',
        subtitle: 'احجز محترفين موثوقين في منطقتك، وقارن بينهم، وتواصل معهم، واحجز خلال دقائق.',
        popular: 'الأكثر طلبًا:',
        servicesTag: 'الخدمات',
        servicesTitle: 'كيف نقدر نخدمك؟',
        viewAllCategories: 'عرض كل الفئات ←',
        howItWorksTag: 'كيف يعمل',
        howItWorksTitle: 'احجز محترفك في 3 خطوات سهلة',
        proTag: 'للمحترفين',
        proTitle: 'هل تعمل في مجال الخدمات المنزلية؟',
        proDescription:
          'انضم إلى HandyCall وتواصل مع آلاف العملاء الباحثين عن مهاراتك اليوم. حدّد أسعارك، وأدر جدولك، وطوّر أعمالك بدعم من الذكاء الاصطناعي.',
        joinAsPro: 'انضم كمحترف ←',
        viewPricing: 'عرض الأسعار',
        closingTitle: 'جاهز تنجز شغلتك؟',
        closingNote: 'لا تحتاج إلى حساب للبحث، واحصل على عروض مجانية من محترفين موثقين.',
      }
    : {
        badge: "Houston's Home Services Marketplace",
        title: 'Home services, handled.',
        subtitle: 'Find trusted pros in the Houston metro area — read reviews, compare options, and book in minutes.',
        popular: 'Popular in Houston:',
        servicesTag: 'Services',
        servicesTitle: 'What can we help you with?',
        viewAllCategories: 'View all categories →',
        howItWorksTag: 'How It Works',
        howItWorksTitle: 'Book a Houston pro in 3 easy steps',
        proTag: 'For Professionals',
        proTitle: 'Are you a home service pro in the Houston area?',
        proDescription:
          'Join HandyCall and connect with Houston homeowners looking for your skills. Set your own rates, manage your schedule, and grow your business with AI-powered tools.',
        joinAsPro: 'Join as a Pro — Free →',
        viewPricing: 'Learn More',
        closingTitle: 'Ready to get something fixed?',
        closingNote: 'No sign-up required to search. Free quotes from verified Houston-area pros.',
      };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <style>{`
        @keyframes hc-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white px-4 pb-20 pt-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16,185,129,0.09) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn direction="up" duration={700}>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              {isArabic ? (
                <>
                  خدمات المنزل،{' '}
                  <span className="hc-shimmer-text">مضمونة.</span>
                </>
              ) : (
                <>
                  Home services, <span className="hc-shimmer-text">handled.</span>
                </>
              )}
            </h1>

            <p className="mt-4 text-xl leading-relaxed text-slate-500">{copy.subtitle}</p>
          </FadeIn>

          <FadeIn direction="up" delay={150} duration={700}>
            <SearchBar className="mt-10 shadow-md" size="lg" />

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-slate-400">
              <span className="font-medium">{copy.popular}</span>
              {POPULAR_TAGS[language].map((tag) => (
                <Link
                  key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                  className="transition-colors hover:text-emerald-600 hover:underline"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Service Photos Strip ─────────────────────────────────────────── */}
      <section className="bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SERVICE_PHOTOS.map((photo, i) => (
              <FadeIn key={photo.alt} direction="up" delay={i * 60}>
                <div className="group relative overflow-hidden rounded-xl">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-44"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-xs font-semibold text-white drop-shadow">
                    {isArabic ? photo.label.ar : photo.label.en}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category Grid ────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-10 text-center">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                {copy.servicesTag}
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                {copy.servicesTitle}
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {FEATURED_MARKETPLACE_CATEGORIES.map((cat, i) => (
              <FadeIn key={cat.slug} direction="up" delay={i * 50}>
                <CategoryCard nameEn={cat.title} nameAr={cat.titleAr} slug={cat.slug} />
              </FadeIn>
            ))}
          </div>

          <FadeIn direction="up" delay={200}>
            <div className="mt-8 text-center">
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                {copy.viewAllCategories}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-slate-100 bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-14 text-center">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                {copy.howItWorksTag}
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                {copy.howItWorksTitle}
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} direction="up" delay={i * 120}>
                <div className="flex flex-col">
                  <span className="text-5xl font-black text-emerald-100 leading-none select-none">
                    {step.num}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{step.title[language]}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description[language]}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Service Scenes ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-10 text-center">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                {isArabic ? 'محترفون موثوقون' : 'Trusted Professionals'}
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                {isArabic ? 'متخصصون في كل ما تحتاجه' : 'Specialists for every job in Houston'}
              </h2>
              <p className="mt-3 text-slate-500">
                {isArabic
                  ? 'من تصليح المكيفات إلى التنظيف العميق، محترفونا موثوقون ومستعدون.'
                  : 'From AC repair to deep cleaning — verified Houston-area pros ready when you are.'}
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=560&fit=crop&q=80',
                alt: 'Handyman at work',
                tag: { en: 'Handyman', ar: 'أعمال يدوية' },
                title: { en: 'Handymen for every fix, large or small', ar: 'خبراء لكل إصلاح صغير أو كبير' },
              },
              {
                img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&h=560&fit=crop&q=80',
                alt: 'Painter at work',
                tag: { en: 'Painting', ar: 'دهان' },
                title: { en: 'Interior & exterior painting pros', ar: 'محترفو دهان داخلي وخارجي' },
              },
              {
                img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&h=560&fit=crop&q=80',
                alt: 'Professional cleaning',
                tag: { en: 'House Cleaning', ar: 'تنظيف منازل' },
                title: { en: 'Deep & professional cleaning', ar: 'تنظيف عميق واحترافي' },
              },
            ].map((card, i) => (
              <FadeIn key={i} direction="up" delay={i * 80}>
                <div className="relative h-72 overflow-hidden rounded-2xl">
                  <img src={card.img} alt={card.alt} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                      {isArabic ? card.tag.ar : card.tag.en}
                    </p>
                    <p className="mt-1 text-base font-bold leading-tight">
                      {isArabic ? card.title.ar : card.title.en}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn direction="up" delay={200}>
            <div className="mt-8 text-center">
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                {isArabic ? 'تصفح جميع الفئات ←' : 'Browse all categories →'}
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Pro CTA ──────────────────────────────────────────────────────── */}
      <section id="pro-cta" className="bg-emerald-600 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn direction="up">
            {/* Free listing banner — first thing pros see */}
            <div className="mx-auto mb-8 inline-flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-lg">
              <span className="text-2xl font-black text-emerald-600">100% FREE</span>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" />
              <span className="text-sm font-semibold text-slate-700">Free to list your business</span>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" />
              <span className="text-sm font-semibold text-slate-700">No lead fees — ever</span>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" />
              <span className="text-sm font-semibold text-slate-700">No commissions on jobs</span>
            </div>

            <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
              {copy.proTag}
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white">
              {copy.proTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-emerald-100">
              {copy.proDescription}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register?audience=pro"
                className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-md transition hover:bg-slate-50"
              >
                {copy.joinAsPro}
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-white/40 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copy.viewPricing}
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {PRO_PERKS.map((perk) => (
                <div
                  key={perk.text.en}
                  className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-3 py-4 text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    {perk.icon}
                  </div>
                  <span className="text-xs font-semibold leading-tight text-white">{perk.text[language]}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section
        className="px-4 py-24"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #ecfdf5 50%, #f0fdf4 100%)',
        }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn direction="up">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
              {copy.closingTitle}
            </h2>
            <SearchBar className="mt-8 shadow-md" size="lg" />
            <p className="mt-4 text-sm text-slate-400">{copy.closingNote}</p>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
