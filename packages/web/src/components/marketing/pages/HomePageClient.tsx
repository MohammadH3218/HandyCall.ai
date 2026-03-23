'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { FadeIn } from '@/components/marketing/fade-in';
import { AnimatedCounter } from '@/components/marketing/animated-counter';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { SearchBar } from '@/components/marketing/SearchBar';
import { CategoryCard } from '@/components/marketing/CategoryCard';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import {
  IconHeadset,
  IconBellRinging,
  IconCalendarEvent,
  IconCreditCard,
} from '@tabler/icons-react';

const TRUST_STATS = [
  {
    value: '2500',
    suffix: '+',
    label: { en: 'Verified Pros', ar: 'محترفون موثقون' },
  },
  {
    value: '4.8',
    suffix: '★',
    label: { en: 'Average Rating', ar: 'متوسط التقييم' },
  },
  {
    value: '<30',
    suffix: { en: ' min', ar: ' دقيقة' },
    label: { en: 'Average Response', ar: 'متوسط وقت الرد' },
  },
  {
    value: '20',
    suffix: '+',
    label: { en: 'Cities Covered', ar: 'مدن مغطاة' },
  },
];

const CATEGORIES = [
  { nameEn: 'AC & HVAC', nameAr: 'التكييف والتبريد', slug: 'ac-repair' },
  { nameEn: 'Plumbing', nameAr: 'السباكة', slug: 'plumbing' },
  { nameEn: 'Electrical', nameAr: 'الكهرباء', slug: 'electrical' },
  { nameEn: 'House Cleaning', nameAr: 'تنظيف المنازل', slug: 'cleaning' },
  { nameEn: 'Car Washing', nameAr: 'غسيل السيارات', slug: 'car-washing' },
  { nameEn: 'Appliance Repair', nameAr: 'إصلاح الأجهزة', slug: 'appliance-repair' },
  { nameEn: 'Moving & Delivery', nameAr: 'النقل والتوصيل', slug: 'moving' },
  { nameEn: 'Pest Control', nameAr: 'مكافحة الحشرات', slug: 'pest-control' },
  { nameEn: 'Painting', nameAr: 'الدهان', slug: 'painting' },
  { nameEn: 'Carpentry', nameAr: 'النجارة', slug: 'carpentry' },
  { nameEn: 'Landscaping', nameAr: 'تنسيق الحدائق', slug: 'landscaping' },
  { nameEn: 'Handyman', nameAr: 'الأعمال العامة', slug: 'handyman' },
];

const POPULAR_TAGS = {
  en: ['AC Repair', 'House Cleaning', 'Plumbing', 'Car Washing', 'Appliance Repair', 'Electrical', 'Pest Control', 'Moving'],
  ar: ['تصليح المكيفات', 'تنظيف المنازل', 'السباكة', 'غسيل السيارات', 'إصلاح الأجهزة', 'الكهرباء', 'مكافحة الحشرات', 'النقل'],
};

const STEPS = [
  {
    num: '01',
    title: { en: 'Search for a service', ar: 'ابحث عن الخدمة' },
    description: {
      en: 'Tell us what you need and your city. Browse pros by service category across Saudi Arabia.',
      ar: 'أخبرنا بالخدمة التي تحتاجها ومدينتك، ثم تصفح المحترفين حسب الفئة في مختلف مدن المملكة.',
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 32, height: 32 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: { en: 'Compare and choose', ar: 'قارن واختر' },
    description: {
      en: 'Read verified reviews, compare prices, and message pros before you commit to anything.',
      ar: 'اطلع على التقييمات الموثقة، وقارن الأسعار، وتواصل مع المحترفين قبل تأكيد الحجز.',
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 32, height: 32 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: { en: 'Book and relax', ar: 'احجز واسترح' },
    description: {
      en: 'Pick your slot, confirm your booking, and leave the rest to your professional.',
      ar: 'اختر الموعد المناسب، وأكد الحجز، واترك الباقي للمحترف الذي اخترته.',
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 32, height: 32 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
];

const PRO_PERKS = [
  { icon: <IconHeadset className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'AI-powered call handling', ar: 'إدارة المكالمات بالذكاء الاصطناعي' } },
  { icon: <IconBellRinging className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'Instant booking alerts', ar: 'تنبيهات فورية للحجوزات' } },
  { icon: <IconCalendarEvent className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'Built-in CRM & scheduling', ar: 'إدارة عملاء وجدولة مدمجة' } },
  { icon: <IconCreditCard className="h-6 w-6 text-white" stroke={1.6} />, text: { en: 'Secure SAR payments', ar: 'مدفوعات آمنة بالريال' } },
];

const TESTIMONIALS = [
  {
    stars: 5,
    quote: {
      en: 'Found a reliable AC technician in Riyadh within 20 minutes. The booking was smooth and the pro showed up on time. Highly recommend.',
      ar: 'وجدت فني تكييف موثوقًا في الرياض خلال 20 دقيقة فقط. الحجز كان سهلًا ووصل المحترف في الوقت المحدد.',
    },
    name: 'Fatima A.',
    location: 'Riyadh',
    locationAr: 'الرياض',
    service: 'AC Repair',
    serviceAr: 'تصليح المكيفات',
  },
  {
    stars: 5,
    quote: {
      en: 'The electrician was certified, professional, and transparent about pricing upfront. No surprises at the end. This is how it should work.',
      ar: 'كان الكهربائي محترفًا وموثقًا وواضحًا جدًا في التسعير من البداية. لم تكن هناك أي مفاجآت في النهاية.',
    },
    name: 'Omar K.',
    location: 'Jeddah',
    locationAr: 'جدة',
    service: 'Electrical',
    serviceAr: 'الكهرباء',
  },
  {
    stars: 5,
    quote: {
      en: 'Used HandyCall for a deep clean before Eid. The team was incredible, respectful, and fast. I booked again the following week.',
      ar: 'استخدمت هاندي كول لتنظيف عميق قبل العيد. الفريق كان رائعًا ومحترفًا وسريعًا، وحجزت معهم مرة أخرى الأسبوع التالي.',
    },
    name: 'Nora S.',
    location: 'Dammam',
    locationAr: 'الدمام',
    service: 'Deep Cleaning',
    serviceAr: 'تنظيف عميق',
  },
];

export function HomePageClient() {
  const { isArabic, language } = useMarketingLanguage();

  const copy = isArabic
    ? {
        badge: 'منصة خدمات المنازل في السعودية',
        title: 'خدمات المنزل، بكل سهولة.',
        subtitle: 'احجز محترفين موثوقين في مدينتك، وقارن بينهم، وتواصل معهم، واحجز خلال دقائق.',
        popular: 'الأكثر طلبًا:',
        servicesTag: 'الخدمات',
        servicesTitle: 'كيف نقدر نخدمك؟',
        viewAllCategories: 'عرض كل الفئات ←',
        howItWorksTag: 'كيف يعمل',
        howItWorksTitle: 'احجز محترفك في 3 خطوات سهلة',
        stepLabel: 'الخطوة',
        proTag: 'للمحترفين',
        proTitle: 'هل تعمل في مجال الخدمات المنزلية داخل السعودية؟',
        proDescription:
          'انضم إلى HandyCall وتواصل مع آلاف العملاء الباحثين عن مهاراتك اليوم. حدّد أسعارك، وأدر جدولك، وطوّر أعمالك بدعم من الذكاء الاصطناعي.',
        joinAsPro: 'انضم كمحترف ←',
        viewPricing: 'عرض الأسعار',
        reviewsTag: 'التقييمات',
        reviewsTitle: 'ماذا يقول العملاء',
        closingTitle: 'جاهز تنجز شغلتك؟',
        closingNote: 'لا تحتاج إلى حساب للبحث، واحصل على عروض مجانية من محترفين موثقين.',
      }
    : {
        badge: "Saudi Arabia's Home Services Marketplace",
        title: 'Home services, handled.',
        subtitle: 'Find trusted pros near you, read reviews, compare options, and book in minutes.',
        popular: 'Popular:',
        servicesTag: 'Services',
        servicesTitle: 'What can we help you with?',
        viewAllCategories: 'View all categories →',
        howItWorksTag: 'How It Works',
        howItWorksTitle: 'Book a pro in 3 easy steps',
        stepLabel: 'Step',
        proTag: 'For Professionals',
        proTitle: 'Are you a service professional in Saudi Arabia?',
        proDescription:
          'Join HandyCall and connect with thousands of customers looking for your skills today. Set your own rates, manage your schedule, and grow your business with AI-powered tools.',
        joinAsPro: 'Join as a Pro →',
        viewPricing: 'View Pricing',
        reviewsTag: 'Reviews',
        reviewsTitle: 'What customers are saying',
        closingTitle: 'Ready to get something fixed?',
        closingNote: 'No sign-up required to search. Free quotes from verified pros.',
      };

  return (
    <div className="flex min-h-screen flex-col bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
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

      <section className="relative overflow-hidden bg-white px-4 pb-20 pt-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(16,185,129,0.09) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn direction="up" duration={700}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {copy.badge}
            </div>

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

      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            {TRUST_STATS.map((stat, i) => (
              <FadeIn key={stat.label.en} direction="up" delay={i * 80}>
                <div className="flex flex-col items-center">
                  <p className="text-4xl font-extrabold text-slate-900">
                    <AnimatedCounter value={stat.value} />
                    <span>{typeof stat.suffix === 'string' ? stat.suffix : stat.suffix[language]}</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{stat.label[language]}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

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
            {CATEGORIES.map((cat, i) => (
              <FadeIn key={cat.slug} direction="up" delay={i * 50}>
                <CategoryCard {...cat} />
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

      <section id="how-it-works" className="border-t border-slate-100 bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-12 text-center">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                {copy.howItWorksTag}
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                {copy.howItWorksTitle}
              </h2>
            </div>
          </FadeIn>

          <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div
              className="absolute left-0 right-0 top-10 hidden border-t-2 border-dashed border-emerald-200 sm:block"
              style={{ zIndex: 0 }}
            />
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} direction="up" delay={i * 120}>
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-emerald-600 shadow-sm">
                    {step.icon}
                  </div>
                  <span className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-500">
                    {copy.stepLabel} {step.num}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title[language]}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description[language]}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-10 text-center">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                {isArabic ? 'محترفون موثوقون' : 'Trusted Professionals'}
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                {isArabic ? 'متخصصون في كل ما تحتاجه' : 'Specialists for every job'}
              </h2>
              <p className="mt-3 text-slate-500">
                {isArabic
                  ? 'من تصليح المكيفات إلى التنظيف العميق، محترفونا موثوقون ومستعدون.'
                  : 'From AC repair to deep cleaning — verified pros ready when you are.'}
              </p>
            </div>
          </FadeIn>

          {/* 3-photo grid: large left, two stacked right */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:grid-rows-2">
            {/* Large card - spans 2 rows */}
            <FadeIn direction="up" delay={0}>
              <div className="sm:row-span-2">
                <div className="relative h-64 overflow-hidden rounded-2xl sm:h-full" style={{ minHeight: '320px' }}>
                  <img
                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=700&fit=crop&q=80"
                    alt="Electrician at work"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                      {isArabic ? 'كهرباء' : 'Electrical'}
                    </p>
                    <p className="mt-1 text-lg font-bold leading-tight">
                      {isArabic ? 'كهربائيون معتمدون في منزلك' : 'Certified electricians, at your door'}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Top-right card */}
            <FadeIn direction="up" delay={80}>
              <div className="sm:col-span-2">
                <div className="relative h-48 overflow-hidden rounded-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop&q=80"
                    alt="AC technician"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                      {isArabic ? 'تكييف وتبريد' : 'AC & HVAC'}
                    </p>
                    <p className="mt-1 text-lg font-bold leading-tight">
                      {isArabic ? 'صيانة وتنظيف المكيفات' : 'AC maintenance & deep cleaning'}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Bottom-right card */}
            <FadeIn direction="up" delay={160}>
              <div className="sm:col-span-2">
                <div className="relative h-48 overflow-hidden rounded-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&h=400&fit=crop&q=80"
                    alt="Professional cleaning"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                      {isArabic ? 'تنظيف منازل' : 'House Cleaning'}
                    </p>
                    <p className="mt-1 text-lg font-bold leading-tight">
                      {isArabic ? 'تنظيف عميق واحترافي' : 'Deep & professional cleaning'}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
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

      <ProductPreview />

      <section id="pro-cta" className="bg-emerald-600 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn direction="up">
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

      <section className="border-t border-slate-100 bg-slate-50 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn direction="up">
            <div className="mb-10 text-center">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                {copy.reviewsTag}
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                {copy.reviewsTitle}
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} direction="up" delay={i * 100}>
                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-lg text-amber-400">{'★'.repeat(t.stars)}</div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">
                    "{t.quote[language]}"
                  </p>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {isArabic ? t.locationAr : t.location}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="text-xs font-semibold text-emerald-600">
                        {isArabic ? t.serviceAr : t.service}
                      </span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

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
