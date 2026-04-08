'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { apiClient } from '@/lib/api-client';
import { isCustomerProfileComplete } from '@/lib/customer-profile';
import {
  IconEye, IconEyeOff, IconSearch, IconCalendar, IconShield,
} from '@tabler/icons-react';

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.9-6.9C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.04 6.24C12.6 13.09 17.86 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.43-4.74H24v9h12.7c-.55 3-2.2 5.55-4.7 7.27l7.2 5.6C43.94 36.5 46.5 30.8 46.5 24z" />
    <path fill="#FBBC05" d="M10.6 28.46c-.48-1.44-.76-2.98-.76-4.46s.27-3.02.76-4.46l-8.04-6.24C.92 16.16 0 19.97 0 24c0 4.03.92 7.84 2.56 11.2l8.04-6.24z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.77l-7.2-5.6c-2 1.35-4.56 2.13-8.7 2.13-6.14 0-11.4-3.59-13.4-8.72l-8.04 6.24C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d="M16.7 12.3c0-2.1 1.7-3.1 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.4 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.3 0 1.7.7 3 .7 1.2 0 2-.9 2.7-2 .9-1.3 1.2-2.6 1.2-2.7-.1 0-2.3-.9-2.3-3.9z" />
    <path fill="currentColor" d="M14.9 4.2c.6-.7 1-1.7.9-2.7-.9.1-1.9.6-2.5 1.3-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.5-1.3z" />
  </svg>
);

const BENEFITS = [
  { icon: IconSearch, title: 'Find the right pro', desc: 'Browse verified professionals in your city across 30+ home service categories.' },
  { icon: IconCalendar, title: 'Book in minutes', desc: 'No phone tag — request a quote, compare, and confirm all in one place.' },
  { icon: IconShield, title: 'Pay with confidence', desc: 'Card, Apple Pay, or pay on-site when available — simple and secure.' },
];

function CustomerLoginInner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/customer/dashboard';
  const reasonParam = searchParams?.get('reason');
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    reasonParam === 'session_expired' ? 'Your session expired. Please sign in again.' : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'cognito-google-customer' | 'cognito-apple-customer' | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const poolType = (session as any)?.poolType;
    const hasTokens = Boolean((session as any)?.idToken || (session as any)?.accessToken);
    if (poolType !== 'customer' || !hasTokens) return;

    let mounted = true;
    const resolveDestination = async () => {
      try {
        const result = await apiClient.getCustomerProfile();
        if (!mounted) return;
        const isComplete = Boolean(result?.is_complete) || isCustomerProfileComplete(result?.profile);
        if (!isComplete) {
          window.location.replace(`/customer/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return;
        }
        window.location.replace(callbackUrl);
      } catch {
        if (!mounted) return;
        window.location.replace(`/customer/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    };

    void resolveDestination();
    return () => {
      mounted = false;
    };
  }, [callbackUrl, session, status]);

  const handleSocialSignIn = async (provider: 'cognito-google-customer' | 'cognito-apple-customer') => {
    setError('');
    setSocialLoading(provider);
    try {
      const result = await signIn(provider, { callbackUrl });
      if (result?.error) {
        setError(result.error);
        setSocialLoading(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to start social sign-in.');
      setSocialLoading(null);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        pool_type: 'customer',
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const message = result.error.toLowerCase();
        if (message.includes('not confirmed') || message.includes('usernotconfirmed')) {
          setError('Please verify your email first. Check your inbox.');
        } else if (message.includes('incorrect') || message.includes('notauthorized')) {
          setError('Incorrect email or password.');
        } else {
          setError(result.error);
        }
        return;
      }

      if (result?.ok) {
        window.location.assign(result.url || callbackUrl);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-slate-100 bg-slate-50 px-16 py-14">
      <div>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
          Find trusted pros,<br />
          <span className="text-emerald-600">booked in minutes.</span>
        </h1>
        <p className="mt-4 leading-relaxed text-slate-500">
          Thousands of verified home service professionals, ready to help.
        </p>
        <div className="mt-10 space-y-6">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <benefit.icon className="h-5 w-5 text-emerald-600" stroke={1.8} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{benefit.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Are you a service provider?{' '}
        <Link href="/pro/login" className="font-medium text-emerald-600 hover:underline">Sign in as a Pro</Link>
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader hideLogin={true} />
      <div className="flex flex-1">
        {leftPanel}

        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
          <div className="mx-auto w-full max-w-sm">
            <h2 className="text-2xl font-extrabold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your HandyCall account</p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => handleSocialSignIn('cognito-google-customer')}
                disabled={isLoading || Boolean(socialLoading)}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GoogleIcon className="h-4 w-4" />
                {socialLoading === 'cognito-google-customer' ? 'Connecting to Google...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn('cognito-apple-customer')}
                disabled={isLoading || Boolean(socialLoading)}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AppleIcon className="h-4 w-4" />
                {socialLoading === 'cognito-apple-customer' ? 'Connecting to Apple...' : 'Continue with Apple'}
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or sign in with email</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                  <Link href="/forgot-password?audience=customer" className="text-xs text-emerald-600 hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <IconEyeOff className="h-4 w-4" stroke={1.8} /> : <IconEye className="h-4 w-4" stroke={1.8} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-emerald-600 hover:underline">Sign up free</Link>
            </p>
            <p className="mt-4 text-center text-xs text-slate-400 lg:hidden">
              Service provider?{' '}
              <Link href="/pro/login" className="text-emerald-600 hover:underline">Sign in as a Pro</Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <CustomerLoginInner />
    </Suspense>
  );
}
