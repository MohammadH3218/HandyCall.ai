'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { IconCircleCheck, IconMail, IconArrowRight, IconRefresh } from '@tabler/icons-react';

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email') || '';
  const codeParam = searchParams?.get('code') || '';
  const audience = searchParams?.get('audience') || 'pro';

  const poolType = audience === 'customer' ? 'customer' : 'users';
  const loginHref = audience === 'customer' ? '/customer/login' : '/pro/login';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(codeParam);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // 6-digit OTP inputs
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const canAutoVerify = useMemo(() => Boolean(emailParam && codeParam), [emailParam, codeParam]);

  useEffect(() => {
    setEmail(emailParam);
    if (codeParam) {
      setCode(codeParam);
      const chars = codeParam.split('').slice(0, 6);
      setDigits([...chars, ...Array(6 - chars.length).fill('')]);
    }
  }, [emailParam, codeParam]);

  useEffect(() => {
    if (!canAutoVerify) return;
    const run = async () => {
      setIsSubmitting(true);
      setError('');
      try {
        await apiClient.confirmSignUp({ email: emailParam, code: codeParam, pool_type: poolType });
        setSuccess(true);
        const phoneHref = `/verify-phone?email=${encodeURIComponent(emailParam)}&audience=${audience}`;
        setTimeout(() => router.replace(phoneHref), 1800);
      } catch (err: any) {
        setError(err?.message || 'Verification failed. Please enter the code you received.');
      } finally {
        setIsSubmitting(false);
      }
    };
    void run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoVerify]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setCode(next.join(''));
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = pasted.split('').concat(Array(6 - pasted.length).fill(''));
      setDigits(next);
      setCode(pasted);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedCode = digits.join('').trim();
    if (!email.trim() || trimmedCode.length < 6) {
      setError('Please enter your email and the 6-digit code.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.confirmSignUp({ email: email.trim(), code: trimmedCode, pool_type: poolType });
      setSuccess(true);
      const phoneHref = `/verify-phone?email=${encodeURIComponent(email.trim())}&audience=${audience}`;
      setTimeout(() => router.replace(phoneHref), 1800);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResendSuccess(false);
    if (!email.trim()) {
      setError('Enter your email to resend the verification code.');
      return;
    }
    setIsResending(true);
    try {
      await apiClient.resendConfirmation({ email: email.trim(), pool_type: poolType });
      setResendSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to resend the verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader hideLogin={true} />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500 ${success ? 'bg-emerald-600 scale-110' : 'bg-emerald-50 border border-emerald-100'}`}>
              {success
                ? <IconCircleCheck className="h-8 w-8 text-white" stroke={2} />
                : <IconMail className="h-8 w-8 text-emerald-600" stroke={1.5} />
              }
            </div>
          </div>

          {success ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Email verified!</h1>
              <p className="mt-2 text-sm text-slate-500">Now let's verify your phone number…</p>
              <div className="mt-6 flex justify-center">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header text */}
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-slate-900">Enter your verification code</h1>
                <p className="mt-2 text-sm text-slate-500">
                  We sent a 6-digit code to{' '}
                  {emailParam ? (
                    <span className="font-medium text-slate-700">{emailParam}</span>
                  ) : 'your account contact'}
                  . Enter it below to verify your account.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                {/* Email field (only show if not pre-filled) */}
                {!emailParam && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                )}

                {/* OTP digits */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                    Verification code
                  </label>
                  <div className="flex justify-center gap-2.5" onPaste={handleDigitPaste}>
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        disabled={isSubmitting}
                        className={`h-12 w-10 rounded-xl border text-center text-lg font-bold outline-none transition
                          ${d ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-900'}
                          focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100
                          disabled:opacity-50`}
                      />
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Resend success */}
                {resendSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    New code sent.
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || digits.join('').length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Verifying…
                    </>
                  ) : (
                    <>Verify account <IconArrowRight className="h-4 w-4" stroke={2} /></>
                  )}
                </button>

                {/* Resend */}
                <div className="text-center">
                  <span className="text-sm text-slate-500">Didn't get a code? </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    {isResending
                      ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /> Sending…</>
                      : <><IconRefresh className="h-3.5 w-3.5" stroke={2} /> Resend code</>
                    }
                  </button>
                </div>

                <p className="text-center text-sm text-slate-400">
                  Already verified?{' '}
                  <Link href={loginHref} className="font-semibold text-slate-600 hover:text-slate-900">
                    {audience === 'customer' ? 'Go to dashboard' : 'Sign in'}
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
