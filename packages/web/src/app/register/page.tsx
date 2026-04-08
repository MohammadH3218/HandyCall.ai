'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { apiClient } from '@/lib/api-client';
import {
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconCircleCheck,
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
  { text: 'Free to join — no long-term contracts' },
  { text: 'Get matched with customers in your city' },
  { text: 'Manage bookings, schedule, and payments' },
  { text: 'AI-powered call handling and CRM built in' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<'cognito-google' | 'cognito-apple' | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSocialSignUp = async (provider: 'cognito-google' | 'cognito-apple') => {
    setError(null);
    setSocialLoading(provider);
    try {
      const result = await signIn(provider, { callbackUrl: '/onboarding' });
      if (result?.error) {
        setError(result.error);
        setSocialLoading(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to start social sign-up.');
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError('Please agree to the Terms and Privacy Policy.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.phone.replace(/\D/g, '').length !== 10) { setError('Please enter a valid 10-digit US phone number.'); return; }
    setLoading(true);
    setError(null);
    try {
      const nameParts = form.name.trim().split(' ').filter(Boolean);
      const phoneDigits = form.phone.replace(/\D/g, '');
      const phoneNumber = phoneDigits.length === 10 ? `+1${phoneDigits}` : undefined;
      if (!phoneNumber) { setError('Please enter a valid 10-digit US phone number.'); setLoading(false); return; }
      await apiClient.register({
        email: form.email.trim(),
        password: form.password,
        first_name: nameParts[0] || undefined,
        last_name: nameParts.slice(1).join(' ') || undefined,
        phone_number: phoneNumber,
        pool_type: 'users',
      });
      router.push(`/verify-email?email=${encodeURIComponent(form.email.trim())}&audience=pro`);
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

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Social sign-up */}
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => handleSocialSignUp('cognito-google')}
                disabled={loading || Boolean(socialLoading)}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GoogleIcon className="h-4 w-4" />
                {socialLoading === 'cognito-google' ? 'Connecting to Google…' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignUp('cognito-apple')}
                disabled={loading || Boolean(socialLoading)}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AppleIcon className="h-4 w-4" />
                {socialLoading === 'cognito-apple' ? 'Connecting to Apple…' : 'Continue with Apple'}
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or sign up with email</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number</label>
                <div className="flex rounded-lg border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 overflow-hidden">
                  <span className="flex items-center gap-1.5 border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 shrink-0 select-none">
                    🇺🇸 +1
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="(832) 404-1336"
                    value={form.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      set('phone', digits);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none bg-white"
                  />
                </div>
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
