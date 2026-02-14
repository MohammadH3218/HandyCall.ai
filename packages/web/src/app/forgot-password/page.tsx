'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/marketing/site-header';
import { CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return;
    }
    setStatus('sending');
    setErrorMessage('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Unable to send reset link.');
      }
      const until = Date.now() + 30_000;
      setCooldownUntil(until);
      setCooldownSeconds(30);
      setStatus('sent');
      const timer = window.setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Unable to send reset link.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/25 to-white text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-12">
        <Card className="shadow-xl shadow-emerald-100 border-emerald-100">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'sent' ? (
              <div className="space-y-4 animate-fade-up">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-900">Reset link sent</p>
                  <p className="mt-2 text-sm text-slate-600">
                    If that email exists, a reset link has been sent. Please check your inbox and spam.
                  </p>
                  {cooldownSeconds > 0 ? (
                    <p className="mt-3 text-xs text-slate-500">
                      You can request another link in {cooldownSeconds}s.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Didn’t get it? You can resend now.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={cooldownSeconds > 0}
                  onClick={() => setStatus('idle')}
                >
                  {cooldownSeconds > 0 ? 'Resend link' : 'Send another link'}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  Return to <Link className="underline" href="/login">sign in</Link>.
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending...' : 'Send reset link'}
                </Button>
                {status === 'error' ? (
                  <p className="text-xs text-red-600">{errorMessage}</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Return to <Link className="underline" href="/login">sign in</Link>.
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
