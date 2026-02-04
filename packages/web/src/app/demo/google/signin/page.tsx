'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DemoGoogleSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiClient.logDemoGoogleAttempt({
        step: 'signin',
        email: email.trim(),
        passwordProvided: Boolean(password),
      });
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('demo_google_email', email.trim());
      }
      router.push('/demo/google/code');
    } catch (err: any) {
      setError(err?.message || 'Unable to continue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold">
            G
          </div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-slate-500">to continue to HandyCall</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demo Google Sign-In</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Demo only. Do not enter real credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleNext} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-google-email" className="text-xs uppercase tracking-wide text-slate-500">
                  Email
                </Label>
                <Input
                  id="demo-google-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-google-password" className="text-xs uppercase tracking-wide text-slate-500">
                  Password
                </Label>
                <Input
                  id="demo-google-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Continuing...' : 'Next'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          This is a HandyCall demo experience that simulates the Google sign-in flow.
        </p>
      </div>
    </div>
  );
}
