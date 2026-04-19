'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import {
  IconEye, IconEyeOff, IconBriefcase, IconCalendar, IconStar,
} from '@tabler/icons-react';

const BENEFITS = [
  { icon: IconBriefcase, title: 'Manage your marketplace profile', desc: 'Keep your services, rates, and availability up to date from one place.' },
  { icon: IconCalendar, title: 'View bookings & incoming leads', desc: 'See all job requests, confirm appointments, and track your work.' },
  { icon: IconStar, title: 'Build your reputation', desc: 'Collect reviews, showcase your portfolio, and grow your customer base.' },
];

function ProLoginInner() {
  const searchParams = useSearchParams();
  // Default to after-login hub so returning pros bypass the onboarding redirect chain
  const callbackUrl = searchParams?.get('callbackUrl') || '/pro/after-login';
  const reasonParam = searchParams?.get('reason');
  const verifiedParam = searchParams?.get('verified');
  const emailParam = searchParams?.get('email') || '';
  const { data: session, status } = useSession();

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    reasonParam === 'session_expired'
      ? 'Your session expired. Please sign in again.'
      : verifiedParam === '1'
      ? 'Email verified. Sign in to continue to your setup.'
      : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  // Auto-redirect if already authenticated as a pro — but NOT if we just logged out
  // (reason=logged_out prevents the logout → redirect → dashboard loop)
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (reasonParam === 'logged_out') return;
    const poolType = (session as any)?.poolType;
    const hasTokens = Boolean((session as any)?.idToken || (session as any)?.accessToken);
    if (poolType !== 'customer' && hasTokens) window.location.replace(callbackUrl);
  }, [callbackUrl, reasonParam, session, status]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        pool_type: 'users',
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
          Welcome back,<br />
          <span className="text-emerald-600">let&apos;s get to work.</span>
        </h1>
        <p className="mt-4 leading-relaxed text-slate-500">
          Sign in to manage your HandyCall pro profile and stay connected with customers.
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
        Looking for the customer portal?{' '}
        <Link href="/customer/login" className="font-medium text-emerald-600 hover:underline">Sign in as a customer</Link>
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
            <h2 className="text-2xl font-extrabold text-slate-900">Pro sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Access your HandyCall pro dashboard</p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            <div className="mt-6">
              <SocialAuthButtons audience="pro" callbackUrl="/pro/after-login" />
            </div>

            <div className="mt-6 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-300">
              <div className="h-px flex-1 bg-slate-200" />
              <span>or continue with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
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
                  placeholder="you@business.com"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                  <Link href="/forgot-password" className="text-xs text-emerald-600 hover:underline">Forgot password?</Link>
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
              New to HandyCall?{' '}
              <Link href="/register?audience=pro" className="font-semibold text-emerald-600 hover:underline">Join as a Pro</Link>
            </p>
            <p className="mt-4 text-center text-xs text-slate-400 lg:hidden">
              Customer?{' '}
              <Link href="/customer/login" className="text-emerald-600 hover:underline">Sign in as a customer</Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default function ProLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <ProLoginInner />
    </Suspense>
  );
}
