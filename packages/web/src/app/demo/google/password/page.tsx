'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GoogleWordmark = ({ className = '' }: { className?: string }) => (
  <span className={`text-2xl font-medium tracking-tight ${className}`}>
    <span className="text-[#4285f4]">G</span>
    <span className="text-[#ea4335]">o</span>
    <span className="text-[#fbbc05]">o</span>
    <span className="text-[#4285f4]">g</span>
    <span className="text-[#34a853]">l</span>
    <span className="text-[#ea4335]">e</span>
  </span>
);

const Footer = () => (
  <footer className="mx-auto w-full max-w-3xl px-4 pb-8">
    <div className="flex flex-col gap-4 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
      <button
        type="button"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        English (United States)
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-slate-500">
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div className="flex items-center gap-6">
        <button type="button" className="hover:text-slate-900">
          Help
        </button>
        <button type="button" className="hover:text-slate-900">
          Privacy
        </button>
        <button type="button" className="hover:text-slate-900">
          Terms
        </button>
      </div>
    </div>
  </footer>
);

export default function DemoGooglePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEmail(sessionStorage.getItem('demo_google_email') || '');
    }
  }, []);

  const handleNext = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiClient.logDemoGoogleAttempt({
        step: 'password',
        email: email.trim(),
        passwordProvided: Boolean(password),
      });
      router.push('/demo/google/code');
    } catch (err: any) {
      setError(err?.message || 'Unable to continue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f4] text-slate-900">
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <GoogleWordmark className="text-3xl" />
              <h1 className="mt-6 text-3xl font-semibold text-slate-900">Welcome</h1>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.33 0-6 1.67-6 3.5V20h12v-2.5C18 15.67 15.33 14 12 14z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="max-w-[240px] truncate">{email || 'you@gmail.com'}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-slate-500">
                  <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleNext} className="mt-10 space-y-6">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              <div className="relative">
                <Input
                  id="demo-google-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="peer h-14 rounded-md border-slate-300 px-4 pt-5 text-base focus:border-[#1a73e8] focus-visible:ring-0"
                />
                <Label
                  htmlFor="demo-google-password"
                  className="pointer-events-none absolute left-4 top-4 text-sm text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#1a73e8] peer-valid:top-1.5 peer-valid:text-xs"
                >
                  Enter your password
                </Label>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-5 w-5 rounded-sm border-slate-400 text-[#1a73e8] focus:ring-[#1a73e8]"
                />
                Show password
              </label>

              <div className="flex items-center justify-between pt-4">
                <button type="button" className="text-sm font-medium text-[#1a73e8] hover:underline">
                  Forgot password?
                </button>
                <Button
                  type="submit"
                  className="h-10 rounded-md bg-[#1a73e8] px-8 text-sm font-semibold text-white shadow-sm hover:bg-[#155cc2]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Continuing...' : 'Next'}
                </Button>
              </div>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
