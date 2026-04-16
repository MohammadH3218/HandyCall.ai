'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { apiClient } from '@/lib/api-client';
import {
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconCircleCheck,
} from '@tabler/icons-react';

const BENEFITS = [
  { text: 'Free to join — no long-term contracts' },
  { text: 'Get matched with customers across Riyadh districts' },
  { text: 'Manage bookings, schedule, and payments' },
  { text: 'Build your profile, collect reviews, and grow repeat business' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError('Please agree to the Terms and Privacy Policy.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError(null);
    try {
      const nameParts = form.name.trim().split(' ').filter(Boolean);
      await apiClient.register({
        email: form.email.trim(),
        password: form.password,
        first_name: nameParts[0] || undefined,
        last_name: nameParts.slice(1).join(' ') || undefined,
        pool_type: 'users',
      });
      router.push(`/verify-email?audience=pro&email=${encodeURIComponent(form.email.trim())}&callbackUrl=%2Fonboarding%2Fsetup`);
    } catch (err: any) {
      setError(err?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader hideLogin={true} />
      <div className="flex flex-1">
        {/* Left panel — benefits */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-slate-50 border-r border-slate-100 px-16 py-20">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Join as a Pro</span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 leading-tight">
              Start reaching more customers<br />in your local market.
            </h2>
            <p className="mt-4 text-slate-500 text-base leading-relaxed max-w-sm">
              Create your profile, set your services and rates, and start getting booked today.
            </p>
            <ul className="mt-10 space-y-5">
              {BENEFITS.map((b) => (
                <li key={b.text} className="flex items-start gap-3">
                  <IconCircleCheck className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" stroke={1.5} />
                  <span className="text-sm text-slate-700">{b.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-12 text-xs text-slate-400">
              Looking for a service professional?{' '}
              <Link href="/signup" className="font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2">
                Sign up as a customer
              </Link>
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-slate-900">Create your pro account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Already have one?{' '}
              <Link href="/pro/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Sign in
              </Link>
            </p>

            <div className="mt-6">
              <SocialAuthButtons audience="pro" callbackUrl="/onboarding/setup" />
            </div>

            <div className="mt-6 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-300">
              <div className="h-px flex-1 bg-slate-200" />
              <span>or continue with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  required
                  placeholder="Jordan Smith"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@business.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
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
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <IconEyeOff className="h-4 w-4" stroke={1.5} /> : <IconEye className="h-4 w-4" stroke={1.5} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <IconEyeOff className="h-4 w-4" stroke={1.5} /> : <IconEye className="h-4 w-4" stroke={1.5} />}
                  </button>
                </div>
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="underline hover:text-slate-700">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy-policy" className="underline hover:text-slate-700">Privacy Policy</Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {loading ? 'Creating account…' : (
                  <>Create account <IconArrowRight className="h-4 w-4" stroke={2} /></>
                )}
              </button>
            </form>

            {/* Mobile customer link */}
            <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
              Looking for a service professional?{' '}
              <Link href="/signup" className="font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2">
                Sign up as a customer
              </Link>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
