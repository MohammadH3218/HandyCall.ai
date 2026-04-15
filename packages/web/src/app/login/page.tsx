'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { SiteHeader } from '@/components/marketing/site-header';
import {
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconShield,
  IconStar,
  IconCircleCheck,
  IconMapPin,
} from '@tabler/icons-react';

const BENEFITS = [
  { icon: IconStar, text: 'Read verified reviews from real customers' },
  { icon: IconCircleCheck, text: 'Track your bookings and service history' },
  { icon: IconShield, text: 'Pay securely after the job is done' },
  { icon: IconMapPin, text: 'Find pros in your Riyadh district' },
];

function CustomerLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const message = searchParams?.get('message');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        pool_type: 'users',
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        const requiresVerification =
          result.error.includes('verify your email') ||
          result.error.includes('Email not verified');
        setError(
          requiresVerification
            ? 'Please verify your email before signing in.'
            : 'Invalid email or password.',
        );
        setNeedsVerification(requiresVerification);
        return;
      }
      if (result?.url) { router.replace(result.url); return; }
      router.replace(callbackUrl);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader hideLogin />

      <div className="flex flex-1">
        {/* Left panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-slate-50 border-r border-slate-100 px-16 py-20">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
              Welcome back.
            </h2>
            <p className="mt-4 text-slate-500 text-base leading-relaxed max-w-sm">
              Sign in to access your saved services, booking history, and connect with trusted pros in Riyadh.
            </p>
            <ul className="mt-10 space-y-5">
              {BENEFITS.map((b) => (
                <li key={b.text} className="flex items-start gap-3">
                  <b.icon className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" stroke={1.5} />
                  <span className="text-sm text-slate-700">{b.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-12 text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                Sign up free
              </Link>
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">
              New here?{' '}
              <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Create a free account
              </Link>
            </p>

            {message && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
                {needsVerification && (
                  <span className="mt-1.5 block">
                    <Link
                      href={`/verify-email?email=${encodeURIComponent(email)}`}
                      className="font-semibold underline"
                    >
                      Verify your email →
                    </Link>
                  </span>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-4 w-4" stroke={1.5} />
                    ) : (
                      <IconEye className="h-4 w-4" stroke={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign In <IconArrowRight className="h-4 w-4" stroke={2} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-400">
              Are you a service professional?{' '}
              <Link
                href="/pro/login"
                className="font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                Pro Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={null}>
      <CustomerLoginInner />
    </Suspense>
  );
}
