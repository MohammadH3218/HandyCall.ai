'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/marketing/site-header';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      setStatus('sent');
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
              {status === 'sent' ? (
                <p className="text-xs text-emerald-700">
                  If that email exists, a reset link has been sent.
                </p>
              ) : null}
              {status === 'error' ? (
                <p className="text-xs text-red-600">{errorMessage}</p>
              ) : (
                <p className="text-xs text-slate-500">
                  Return to <Link className="underline" href="/login">sign in</Link>.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
