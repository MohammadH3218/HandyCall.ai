'use client';

import Link from 'next/link';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { Logo } from '@/components/ui/logo';

export function SiteFooter() {
  const { isArabic } = useMarketingLanguage();

  const copy = isArabic
    ? {
        tagline: 'نربط منازل السعودية بمحترفي الخدمات الموثوقين.',
        customers: 'للعملاء',
        pros: 'للمحترفين',
        company: 'الشركة',
        legal: 'قانوني',
        findServices: 'ابحث عن خدمات',
        browseCategories: 'تصفح الفئات',
        howItWorks: 'كيف يعمل',
        signIn: 'تسجيل الدخول',
        joinAsPro: 'انضم كمحترف',
        whyHandyCall: 'لماذا HandyCall',
        pricing: 'الأسعار',
        proDashboard: 'لوحة المحترف',
        contact: 'تواصل معنا',
        terms: 'شروط الخدمة',
        privacy: 'سياسة الخصوصية',
        smsConsent: 'موافقة الرسائل النصية',
        rights: 'جميع الحقوق محفوظة.',
        country: 'المملكة العربية السعودية',
      }
    : {
        tagline: "Connecting Saudi Arabia's homes with trusted service professionals.",
        customers: 'For Customers',
        pros: 'For Pros',
        company: 'Company',
        legal: 'Legal',
        findServices: 'Find Services',
        browseCategories: 'Browse Categories',
        howItWorks: 'How It Works',
        signIn: 'Sign In',
        joinAsPro: 'Join as a Pro',
        whyHandyCall: 'Why HandyCall',
        pricing: 'Pricing',
        proDashboard: 'Pro Dashboard',
        contact: 'Contact',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        smsConsent: 'SMS Consent',
        rights: 'All rights reserved.',
        country: 'Saudi Arabia',
      };

  return (
    <footer className="bg-slate-900" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-10 border-b border-slate-800 pb-10">
          <Logo width={130} height={32} className="brightness-0 invert" />
          <p className="mt-3 max-w-sm text-sm text-slate-400">{copy.tagline}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {copy.customers}
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/search" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.findServices}</Link></li>
              <li><Link href="/categories" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.browseCategories}</Link></li>
              <li><Link href="/#how-it-works" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.howItWorks}</Link></li>
              <li><Link href="/login" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.signIn}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {copy.pros}
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/register?audience=pro" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.joinAsPro}</Link></li>
              <li><Link href="/#pro-cta" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.whyHandyCall}</Link></li>
              <li><Link href="/pricing" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.pricing}</Link></li>
              <li><Link href="/dashboard" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.proDashboard}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {copy.company}
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/contact" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.contact}</Link></li>
              <li><Link href="mailto:hello@handycall.org" className="text-sm text-slate-400 transition-colors hover:text-white">hello@handycall.org</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              {copy.legal}
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/terms" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.terms}</Link></li>
              <li><Link href="/privacy-policy" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.privacy}</Link></li>
              <li><Link href="/sms-consent" className="text-sm text-slate-400 transition-colors hover:text-white">{copy.smsConsent}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">&copy; 2026 HandyCall. {copy.rights}</p>
          <p className="text-xs text-slate-600">{copy.country}</p>
        </div>
      </div>
    </footer>
  );
}
