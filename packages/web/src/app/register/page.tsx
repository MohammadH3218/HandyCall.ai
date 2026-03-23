'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/logo';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { IconArrowRight } from '@tabler/icons-react';

const PRO_SETUP_STEPS = [
  {
    title: { en: 'Build your pro profile', ar: 'أنشئ ملفك المهني' },
    description: { en: 'Add your photo, services, city, and a short bio.', ar: 'أضف صورتك وخدماتك ومدينتك ونبذة عنك.' },
  },
  {
    title: { en: 'Set your services & pricing', ar: 'حدد خدماتك وأسعارك' },
    description: { en: 'List what you offer and your starting rates in SAR.', ar: 'أدرج ما تقدمه وأسعارك الابتدائية بالريال.' },
  },
  {
    title: { en: 'Get matched with customers', ar: 'تواصل مع العملاء' },
    description: { en: 'Customers in your city find and message you directly.', ar: 'يجدك العملاء في مدينتك ويتواصلون معك مباشرة.' },
  },
  {
    title: { en: 'Manage bookings & schedule', ar: 'إدارة الحجوزات والجدول' },
    description: { en: 'Confirm jobs, set availability, and track your work.', ar: 'أكّد الأعمال وحدد إتاحتك وتابع مشاريعك.' },
  },
  {
    title: { en: 'Get paid securely', ar: 'استلم المدفوعات بأمان' },
    description: { en: 'Accept Mada, STC Pay, Apple Pay, or cash on-site.', ar: 'اقبل مدى وSTC Pay وApple Pay أو نقدًا في الموقع.' },
  },
];

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.9-6.9C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.04 6.24C12.6 13.09 17.86 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24c0-1.64-.15-3.22-.43-4.74H24v9h12.7c-.55 3-2.2 5.55-4.7 7.27l7.2 5.6C43.94 36.5 46.5 30.8 46.5 24z"
    />
    <path
      fill="#FBBC05"
      d="M10.6 28.46c-.48-1.44-.76-2.98-.76-4.46s.27-3.02.76-4.46l-8.04-6.24C.92 16.16 0 19.97 0 24c0 4.03.92 7.84 2.56 11.2l8.04-6.24z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.9-5.77l-7.2-5.6c-2 1.35-4.56 2.13-8.7 2.13-6.14 0-11.4-3.59-13.4-8.72l-8.04 6.24C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M16.7 12.3c0-2.1 1.7-3.1 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.4 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.3 0 1.7.7 3 .7 1.2 0 2-.9 2.7-2 .9-1.3 1.2-2.6 1.2-2.7-.1 0-2.3-.9-2.3-3.9z"
    />
    <path
      fill="currentColor"
      d="M14.9 4.2c.6-.7 1-1.7.9-2.7-.9.1-1.9.6-2.5 1.3-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.5-1.3z"
    />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const { language, isArabic } = useMarketingLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'cognito-google' | 'cognito-apple' | null>(
    null
  );

  const handleSocialSignUp = async (provider: 'cognito-google' | 'cognito-apple') => {
    setError('');
    setSocialLoading(provider);
    try {
      const result = await signIn(provider, { callbackUrl: '/onboarding' });
      if (result?.error) {
        setError(result.error);
        setSocialLoading(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to start social sign up.');
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const trimmedName = fullName.trim();
      if (!trimmedName) {
        setError('Full name is required.');
        setIsSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsSubmitting(false);
        return;
      }
      const nameParts = trimmedName.split(' ').filter(Boolean);
      await apiClient.register({
        email: email.trim(),
        password,
        first_name: nameParts[0] || undefined,
        last_name: nameParts.slice(1).join(' ') || undefined,
        pool_type: 'users',
      });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&audience=pro`);
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copy = isArabic
    ? {
        eyebrow: 'انضم كمحترف',
        title: 'ابدأ في الوصول إلى آلاف العملاء في السعودية.',
        subtitle: 'أنشئ ملفك المهني، حدد خدماتك وأسعارك، وابدأ في استقبال الحجوزات اليوم.',
        afterSignup: 'ماذا يحدث بعد التسجيل',
        bullets: ['مجاني للانضمام', 'لا عقود ملزمة', 'ابدأ في دقائق'],
        createTitle: 'أنشئ حسابك',
        createSubtitle: 'سنرسل لك رمز التحقق عبر البريد الإلكتروني بعد ذلك.',
        google: 'المتابعة باستخدام Google',
        apple: 'المتابعة باستخدام Apple',
        googleLoading: 'جارٍ الاتصال بـ Google…',
        appleLoading: 'جارٍ الاتصال بـ Apple…',
        emailDivider: 'أو أنشئ الحساب باستخدام البريد',
        fullName: 'الاسم الكامل',
        fullNamePlaceholder: 'محمد صاحب الشركة',
        email: 'البريد الإلكتروني',
        emailPlaceholder: 'you@business.com',
        password: 'كلمة المرور',
        passwordPlaceholder: '8 أحرف على الأقل',
        confirmPassword: 'تأكيد كلمة المرور',
        confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور',
        creating: 'جارٍ إنشاء الحساب…',
        create: 'إنشاء الحساب',
        termsIntro: 'بإنشاء الحساب فإنك توافق على',
        terms: 'الشروط',
        privacy: 'سياسة الخصوصية',
        and: 'و',
        alreadyHaveAccount: 'لديك حساب بالفعل؟',
        signIn: 'تسجيل الدخول',
      }
    : {
        eyebrow: 'Join as a Pro',
        title: 'Start reaching thousands of customers across Saudi Arabia.',
        subtitle: 'Create your profile, set your services and rates, and start getting booked today.',
        afterSignup: 'What happens after signup',
        bullets: ['Free to join', 'No long-term contracts', 'Get started in minutes'],
        createTitle: 'Create your account',
        createSubtitle: "We'll email you a verification code next.",
        google: 'Continue with Google',
        apple: 'Continue with Apple',
        googleLoading: 'Connecting to Google…',
        appleLoading: 'Connecting to Apple…',
        emailDivider: 'or sign up with email',
        fullName: 'Full name',
        fullNamePlaceholder: 'Ahmed Al-Zahrani',
        email: 'Email',
        emailPlaceholder: 'you@business.com',
        password: 'Password',
        passwordPlaceholder: 'Minimum 8 characters',
        confirmPassword: 'Confirm password',
        confirmPasswordPlaceholder: 'Re-enter your password',
        creating: 'Creating account…',
        create: 'Create account',
        termsIntro: 'By creating an account you agree to our',
        terms: 'Terms',
        privacy: 'Privacy Policy',
        and: 'and',
        alreadyHaveAccount: 'Already have an account?',
        signIn: 'Sign in',
      };

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <SiteHeader hideLogin={true} />

      <main className="mx-auto grid max-w-6xl items-start gap-12 px-4 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:pt-16">
        {/* ── Left: onboarding context ── */}
        <div className="space-y-8 lg:pt-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              {copy.eyebrow}
            </span>
            <h1 className="mt-3 text-[2.6rem] font-bold leading-[1.08] tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-500 dark:text-slate-400">
              {copy.subtitle}
            </p>
          </div>

          {/* Setup steps */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {copy.afterSignup}
            </p>
            {PRO_SETUP_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="flex items-start gap-4 rounded-xl border border-border/80 bg-card/80 p-4 backdrop-blur-sm"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {step.title[language]}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {step.description[language]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            {copy.bullets.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: form ── */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/88 p-8 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.42)] backdrop-blur-sm">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {copy.createTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {copy.createSubtitle}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Social buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSocialSignUp('cognito-google')}
                disabled={isSubmitting || Boolean(socialLoading)}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border/80 bg-card/75 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-accent/80 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GoogleIcon className="h-4 w-4" />
                {socialLoading === 'cognito-google'
                  ? copy.googleLoading
                  : copy.google}
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignUp('cognito-apple')}
                disabled={isSubmitting || Boolean(socialLoading)}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border/80 bg-card/75 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-accent/80 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AppleIcon className="h-4 w-4" />
                {socialLoading === 'cognito-apple' ? copy.appleLoading : copy.apple}
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {copy.emailDivider}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="full-name"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {copy.fullName}
                </Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={copy.fullNamePlaceholder}
                  disabled={isSubmitting}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {copy.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {copy.password}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirm-password"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {copy.confirmPassword}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={copy.confirmPasswordPlaceholder}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? copy.creating : copy.create}
                {!isSubmitting && <IconArrowRight className="h-4 w-4" stroke={1.5} />}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              {copy.termsIntro}{' '}
              <Link href="/terms" className="underline hover:text-slate-600">
                {copy.terms}
              </Link>{' '}
              {copy.and}{' '}
              <Link href="/privacy-policy" className="underline hover:text-slate-600">
                {copy.privacy}
              </Link>
              .
            </p>
            <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
              {copy.alreadyHaveAccount}{' '}
              <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-600">
                {copy.signIn}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
