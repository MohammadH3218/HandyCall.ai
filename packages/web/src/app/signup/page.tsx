'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { apiClient } from '@/lib/api-client';
import { IconArrowRight, IconEye, IconEyeOff, IconShield, IconStar } from '@tabler/icons-react';

const BENEFITS = [
  { icon: IconStar, text: 'Save searches, requests, and bookings in one account' },
  { icon: IconShield, text: 'Create your account only when you are ready to continue' },
];

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms and Privacy Policy.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.register({
        email: form.email.trim(),
        password: form.password,
        pool_type: 'customer',
      });
      router.push(`/verify-email?audience=customer&email=${encodeURIComponent(form.email.trim())}`);
    } catch (err: any) {
      setError(err?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader hideLogin />
      <div className="flex flex-1">
        <div className="hidden border-r border-slate-100 bg-slate-50 px-16 py-20 lg:flex lg:w-1/2 lg:flex-col lg:justify-center">
          <div>
            <h2 className="text-3xl font-extrabold leading-tight text-slate-900">
              Create your customer account
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-500">
              Sign up to save your searches, manage future bookings, and keep everything in one place.
            </p>
            <ul className="mt-10 space-y-5">
              {BENEFITS.map((benefit) => (
                <li key={benefit.text} className="flex items-start gap-3">
                  <benefit.icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" stroke={1.5} />
                  <span className="text-sm text-slate-700">{benefit.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-12 text-xs text-slate-400">
              Are you a service professional?{' '}
              <Link href="/for-pros" className="font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900">
                Visit the For Pros page
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-slate-900">Sign up</h1>
            <p className="mt-1 text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/customer/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Log in
              </Link>
            </p>

            <div className="mt-6">
              <SocialAuthButtons audience="customer" callbackUrl="/customer/onboarding?callbackUrl=%2Fcustomer%2Fdashboard" />
            </div>

            <div className="mt-6 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-300">
              <div className="h-px flex-1 bg-slate-200" />
              <span>or continue with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <IconEyeOff className="h-4 w-4" stroke={1.5} /> : <IconEye className="h-4 w-4" stroke={1.5} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 ${
                      form.confirmPassword && form.confirmPassword !== form.password
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? <IconEyeOff className="h-4 w-4" stroke={1.5} /> : <IconEye className="h-4 w-4" stroke={1.5} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className="text-xs leading-relaxed text-slate-500">
                  I agree to the{' '}
                  <Link href="/terms" className="underline hover:text-slate-700">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy-policy" className="underline hover:text-slate-700">Privacy Policy</Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? 'Creating account...' : (
                  <>Create account <IconArrowRight className="h-4 w-4" stroke={2} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
