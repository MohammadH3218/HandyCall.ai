'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import {
  IconCircleCheck,
  IconPhone,
  IconArrowRight,
  IconRefresh,
  IconEdit,
  IconX,
} from '@tabler/icons-react';

// Raw fetch with keepalive=true so it fires even after page unload
function deleteUnverifiedBeacon(email: string, poolType: string) {
  try {
    fetch('/api/proxy/auth/delete-unverified', {
      method: 'DELETE',
      body: JSON.stringify({ email, pool_type: poolType }),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

function VerifyPhonePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email') || '';
  const audience = searchParams?.get('audience') || 'customer';

  const poolType = audience === 'pro' ? 'users' : 'customer';
  const loginHref = audience === 'pro' ? '/pro/login?callbackUrl=%2Fonboarding' : '/customer/login';
  const signupHref = audience === 'pro' ? '/register' : '/signup';

  // Track whether phone was successfully verified — prevents cleanup from deleting
  const isVerified = useRef(false);
  // Track whether the component has ever mounted (prevents double-sends in Strict Mode)
  const codeSentRef = useRef(false);

  const [phoneHint, setPhoneHint] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Edit phone mode
  const [editingPhone, setEditingPhone] = useState(false);
  const [noPhoneOnFile, setNoPhoneOnFile] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const startCooldown = () => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Send SMS code on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!emailParam || codeSentRef.current) return;
    codeSentRef.current = true;

    const sendCode = async () => {
      try {
        const res = await fetch('/api/proxy/auth/send-phone-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailParam, pool_type: poolType }),
        });
        const data = await res.json();
        if (res.ok && (data.ok || data.data?.ok)) {
          setPhoneHint(data.phone_hint || data.data?.phone_hint || '');
          startCooldown();
        } else {
          const msg = (data.message || data.data?.message || '') as string;
          if (msg.toLowerCase().includes('no phone') || msg.toLowerCase().includes('phone number')) {
            // Pro user has no phone on file — open the add-phone form directly
            setNoPhoneOnFile(true);
            setEditingPhone(true);
          } else {
            setError(msg || 'Failed to send SMS code. Please try again.');
          }
        }
      } catch {
        setError('Failed to send SMS code. Please check your connection.');
      } finally {
        setIsSending(false);
      }
    };

    sendCode();
  }, [emailParam, poolType]);

  // ── Delete-on-leave logic ───────────────────────────────────────────────
  useEffect(() => {
    if (!emailParam) return;

    const handleBeforeUnload = () => {
      if (!isVerified.current) {
        deleteUnverifiedBeacon(emailParam, poolType);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also fires when Next.js navigates away (component unmounts)
      if (!isVerified.current) {
        deleteUnverifiedBeacon(emailParam, poolType);
      }
    };
  }, [emailParam, poolType]);

  // ── OTP digit handlers ──────────────────────────────────────────────────
  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
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
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  // ── Verify ──────────────────────────────────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = digits.join('');
    if (code.length < 6) { setError('Please enter the 6-digit code.'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/proxy/auth/verify-phone-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, code, pool_type: poolType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.data?.message || 'Verification failed.');

      isVerified.current = true;
      setSuccess(true);
      setTimeout(() => router.replace(loginHref), 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend ──────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setError('');
    setResendSuccess(false);
    setIsResending(true);
    try {
      const res = await fetch('/api/proxy/auth/send-phone-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, pool_type: poolType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend code.');
      setPhoneHint(data.phone_hint || data.data?.phone_hint || phoneHint);
      setResendSuccess(true);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      startCooldown();
    } catch (err: any) {
      setError(err.message || 'Unable to resend the code.');
    } finally {
      setIsResending(false);
    }
  };

  // ── Update phone number ─────────────────────────────────────────────────
  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    const trimmed = newPhone.trim();
    // Normalize to E.164: if it already starts with '+', use as-is; otherwise assume +1 (US)
    let e164: string;
    if (trimmed.startsWith('+')) {
      const digitsOnly = trimmed.replace(/[^\d+]/g, '');
      if (digitsOnly.length < 8) {
        setPhoneError('Please enter a valid phone number including country code (e.g. +966 5x xxx xxxx).');
        return;
      }
      e164 = digitsOnly;
    } else {
      const digits10 = trimmed.replace(/\D/g, '');
      if (digits10.length !== 10) {
        setPhoneError('Enter a 10-digit US number or include the country code (e.g. +966 5xxxxxxxx).');
        return;
      }
      e164 = `+1${digits10}`;
    }

    setIsUpdatingPhone(true);
    try {
      const res = await fetch('/api/proxy/auth/update-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, phone_number: e164, pool_type: poolType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update phone number.');
      setPhoneHint(data.phone_hint || data.data?.phone_hint || e164);
      setEditingPhone(false);
      setNoPhoneOnFile(false);
      setNewPhone('');
      setResendSuccess(true);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      startCooldown();
    } catch (err: any) {
      setPhoneError(err.message || 'Failed to update phone number.');
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  // ── Cancel: explicitly delete account + go back to signup ──────────────
  const handleCancel = async () => {
    isVerified.current = true; // prevent the unmount cleanup from double-deleting
    try {
      await fetch('/api/proxy/auth/delete-unverified', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, pool_type: poolType }),
      });
    } catch {
      // best-effort
    }
    router.replace(signupHref);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader hideLogin={true} />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500 ${
              success ? 'bg-emerald-600 scale-110' : 'bg-emerald-50 border border-emerald-100'
            }`}>
              {success
                ? <IconCircleCheck className="h-8 w-8 text-white" stroke={2} />
                : <IconPhone className="h-8 w-8 text-emerald-600" stroke={1.5} />
              }
            </div>
          </div>

          {success ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Phone verified!</h1>
              <p className="mt-2 text-sm text-slate-500">
                {audience === 'pro'
                  ? 'Account ready! Taking you to sign in…'
                  : 'Your account is ready. Taking you to the dashboard…'}
              </p>
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
              {/* Header */}
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-slate-900">
                  {noPhoneOnFile ? 'Add your phone number' : 'Verify your phone'}
                </h1>
                {noPhoneOnFile ? (
                  <p className="mt-2 text-sm text-slate-500">
                    We need your phone number to send a verification code.
                  </p>
                ) : isSending ? (
                  <p className="mt-2 text-sm text-slate-500">Sending verification code…</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    We texted a 6-digit code to{' '}
                    <span className="font-medium text-slate-700">{phoneHint || 'your phone'}</span>.
                    Enter it below.
                  </p>
                )}
              </div>

              {/* Edit phone toggle */}
              {!editingPhone && !isSending && (
                <div className="mb-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => { setEditingPhone(true); setPhoneError(''); }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    <IconEdit className="h-3.5 w-3.5" stroke={2} />
                    Wrong number? Update it
                  </button>
                </div>
              )}

              {/* Edit / Add phone form */}
              {editingPhone && (
                <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {noPhoneOnFile ? 'Enter your phone number' : 'Enter new phone number'}
                    </p>
                    {!noPhoneOnFile && (
                      <button
                        type="button"
                        onClick={() => { setEditingPhone(false); setNewPhone(''); setPhoneError(''); }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <IconX className="h-4 w-4" stroke={2} />
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleUpdatePhone} className="space-y-3">
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="+1 555 123 4567 or +966 5x xxx xxxx"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      autoFocus
                    />
                    {phoneError && (
                      <p className="text-xs text-red-500">{phoneError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isUpdatingPhone || newPhone.trim().length < 7}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isUpdatingPhone ? (
                        <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving…</>
                      ) : noPhoneOnFile ? (
                        <>Save & send code <IconArrowRight className="h-4 w-4" stroke={2} /></>
                      ) : (
                        <>Update & resend code <IconArrowRight className="h-4 w-4" stroke={2} /></>
                      )}
                    </button>
                  </form>
                </div>
              )}

              <form onSubmit={handleVerify} className={`space-y-5 ${noPhoneOnFile ? 'hidden' : ''}`}>
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
                        disabled={isSubmitting || isSending}
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
                {resendSuccess && !error && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    New code sent to {phoneHint}.
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || isSending || digits.join('').length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Verifying…</>
                  ) : (
                    <>Verify phone <IconArrowRight className="h-4 w-4" stroke={2} /></>
                  )}
                </button>

                {/* Resend */}
                <div className="text-center">
                  <span className="text-sm text-slate-500">Didn't get a code? </span>
                  {resendCooldown > 0 ? (
                    <span className="text-sm text-slate-400">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending || isSending}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                    >
                      {isResending
                        ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /> Sending…</>
                        : <><IconRefresh className="h-3.5 w-3.5" stroke={2} /> Resend code</>
                      }
                    </button>
                  )}
                </div>

                {/* Cancel — deletes account */}
                <div className="pt-2 text-center border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">
                    Changed your mind? Cancelling will remove your account so you can start fresh.
                  </p>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm text-slate-500 hover:text-red-600 underline underline-offset-2 transition"
                  >
                    Cancel and delete my account
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={null}>
      <VerifyPhonePageInner />
    </Suspense>
  );
}
