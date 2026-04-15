'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { apiClient } from '@/lib/api-client';
import {
  IconArrowRight,
  IconCircleCheck,
  IconMail,
  IconRefresh,
} from '@tabler/icons-react';

function buildLoginHref(audience: string, email: string) {
  const isCustomer = audience === 'customer';
  const basePath = isCustomer ? '/customer/login' : '/pro/login';
  const callbackUrl = isCustomer
    ? '/customer/onboarding?callbackUrl=%2Fcustomer%2Fdashboard'
    : '/onboarding/setup';
  const params = new URLSearchParams({
    verified: '1',
    callbackUrl,
  });

  if (email) {
    params.set('email', email);
  }

  return `${basePath}?${params.toString()}`;
}

function buildCallbackUrl(audience: string) {
  return audience === 'customer'
    ? '/customer/onboarding?callbackUrl=%2Fcustomer%2Fdashboard'
    : '/onboarding/setup';
}

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const token = searchParams?.get('token') || '';
  const audience = searchParams?.get('audience') || 'pro';
  const poolType = audience === 'customer' ? 'customer' : 'users';
  const callbackUrl = useMemo(() => buildCallbackUrl(audience), [audience]);
  const loginHref = useMemo(() => buildLoginHref(audience, email), [audience, email]);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    const run = async () => {
      setIsVerifying(true);
      setError('');
      try {
        const result = await signIn('email-verification', {
          token,
          redirect: false,
          callbackUrl,
        });
        if (!mounted) return;
        if (result?.error) {
          throw new Error(result.error);
        }
        setIsVerified(true);
        setNotice('Email verified successfully. Redirecting you to the next step.');
        window.setTimeout(() => {
          router.replace(result?.url || callbackUrl);
        }, 1600);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Verification failed. Request a fresh email and try again.');
      } finally {
        if (mounted) {
          setIsVerifying(false);
        }
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [callbackUrl, router, token]);

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Missing email address. Go back and sign up again.');
      return;
    }

    setIsResending(true);
    setError('');
    setNotice('');

    try {
      const result = await apiClient.resendConfirmation({
        email: email.trim(),
        pool_type: poolType as 'customer' | 'users',
      });
      setNotice(result.message || 'Verification email sent.');
    } catch (err: any) {
      setError(err?.message || 'Unable to resend the verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader hideLogin />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            {isVerified ? (
              <IconCircleCheck className="h-8 w-8 text-emerald-600" stroke={1.8} />
            ) : (
              <IconMail className="h-8 w-8 text-emerald-600" stroke={1.8} />
            )}
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {isVerified ? 'Email verified' : isVerifying ? 'Verifying your email' : 'Check your email'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {isVerified
                ? 'Your email is confirmed. We are sending you to the next step now.'
                : isVerifying
                ? 'Hang tight while we confirm your verification link.'
                : email
                ? `We sent a verification link to ${email}. Open it to continue with your account setup.`
                : 'Open the verification email we just sent you to continue with your account setup.'}
            </p>
          </div>

          {notice ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!isVerified && !isVerifying ? (
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isResending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IconRefresh className="h-4 w-4" stroke={2} />
                    Resend verification email
                  </>
                )}
              </button>

              <Link
                href={loginHref}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                I already verified my email
                <IconArrowRight className="h-4 w-4" stroke={2} />
              </Link>
            </div>
          ) : null}

          <p className="mt-8 text-center text-sm text-slate-500">
            Need a different account?{' '}
            <Link
              href={audience === 'customer' ? '/signup' : '/register'}
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Start over
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
