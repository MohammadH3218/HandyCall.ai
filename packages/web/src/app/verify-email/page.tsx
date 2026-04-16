'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/marketing/site-header';
import { apiClient } from '@/lib/api-client';
import { IconArrowRight, IconRefresh } from '@tabler/icons-react';

function buildLoginHref(audience: string, email: string) {
  const isCustomer = audience === 'customer';
  const basePath = isCustomer ? '/customer/login' : '/pro/login';
  const callbackUrl = isCustomer
    ? '/customer/onboarding?callbackUrl=%2Fcustomer%2Fdashboard'
    : '/onboarding/setup';
  const params = new URLSearchParams({ verified: '1', callbackUrl });
  if (email) params.set('email', email);
  return `${basePath}?${params.toString()}`;
}

/** Animated checkmark — draws itself on mount */
function AnimatedCheck() {
  return (
    <div className="ve-check-wrap">
      <svg viewBox="0 0 52 52" fill="none" className="ve-check-svg">
        <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2.5" className="ve-check-circle" />
        <polyline points="14,27 22,35 38,17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ve-check-tick" />
      </svg>
    </div>
  );
}

/** Three pulsing dots — indicates "waiting" */
function WaitingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-emerald-400"
          style={{ animation: `ve-dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

/** Spinning arc loader */
function SpinnerArc() {
  return (
    <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-500" />
  );
}

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const token = searchParams?.get('token') || '';
  const audience = searchParams?.get('audience') || 'pro';
  const poolType = audience === 'customer' ? 'customer' : 'users';
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
        const result = await apiClient.verifyEmailToken(token);
        if (!mounted) return;
        setIsVerified(true);
        setNotice(result.message || 'Email verified successfully.');
        window.setTimeout(() => { router.replace(loginHref); }, 2400);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Verification failed. Request a fresh email and try again.');
      } finally {
        if (mounted) setIsVerifying(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [loginHref, router, token]);

  const handleResend = async () => {
    if (!email.trim()) { setError('Missing email address. Go back and sign up again.'); return; }
    setIsResending(true);
    setError('');
    setNotice('');
    try {
      const result = await apiClient.resendConfirmation({ email: email.trim(), pool_type: poolType as 'customer' | 'users' });
      setNotice(result.message || 'Verification email sent.');
    } catch (err: any) {
      setError(err?.message || 'Unable to resend the verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <style>{`
        @keyframes ve-dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes ve-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ve-pop-in {
          0%   { opacity: 0; transform: scale(0.7); }
          65%  { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ve-circle-draw {
          from { stroke-dashoffset: 160; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes ve-tick-draw {
          from { stroke-dashoffset: 50; }
          to   { stroke-dashoffset: 0; }
        }
        .ve-fade-up { animation: ve-fade-up 0.5s ease both; }
        .ve-fade-up-1 { animation: ve-fade-up 0.5s 0.1s ease both; }
        .ve-fade-up-2 { animation: ve-fade-up 0.5s 0.2s ease both; }
        .ve-check-wrap {
          animation: ve-pop-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
          color: #10b981;
        }
        .ve-check-svg { width: 72px; height: 72px; }
        .ve-check-circle {
          stroke-dasharray: 160;
          stroke-dashoffset: 160;
          animation: ve-circle-draw 0.5s 0.1s ease forwards;
        }
        .ve-check-tick {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: ve-tick-draw 0.35s 0.55s ease forwards;
        }
      `}</style>

      <SiteHeader hideLogin />

      <main className="flex flex-1 items-center justify-center px-4 py-16">

        {/* ── Verifying state ── */}
        {isVerifying && !isVerified && (
          <div className="flex flex-col items-center gap-6 text-center ve-fade-up">
            <SpinnerArc />
            <p className="text-sm font-medium text-slate-500">Confirming your email…</p>
          </div>
        )}

        {/* ── Verified state ── */}
        {isVerified && (
          <div className="flex flex-col items-center gap-5 text-center">
            <AnimatedCheck />
            <div className="ve-fade-up-1">
              <h1 className="text-2xl font-bold text-slate-900">Email verified</h1>
              <p className="mt-2 text-sm text-slate-500">Taking you to the next step…</p>
            </div>
            <div className="ve-fade-up-2">
              <Link
                href={loginHref}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Continue now <IconArrowRight className="h-4 w-4" stroke={2} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Waiting for email click state ── */}
        {!isVerifying && !isVerified && (
          <div className="w-full max-w-md ve-fade-up">
            {/* Top row: dots indicator */}
            <div className="mb-8 flex justify-center">
              <WaitingDots />
            </div>

            <h1 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
              Check your inbox
            </h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
              We sent a verification link to
            </p>

            {email && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center ve-fade-up-1">
                <span className="text-sm font-semibold text-slate-800">{email}</span>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">
              Click the link in the email to activate your account. Check your spam folder if you don&apos;t see it.
            </p>

            {notice && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
                {notice}
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                {error}
              </div>
            )}

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
                    Sending…
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

            <p className="mt-8 text-center text-sm text-slate-500">
              Wrong address?{' '}
              <Link
                href={audience === 'customer' ? '/signup' : '/register'}
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Start over
              </Link>
            </p>
          </div>
        )}
      </main>
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
