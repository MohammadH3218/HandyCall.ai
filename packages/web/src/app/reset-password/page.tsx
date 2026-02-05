'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/marketing/site-header';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    if (password !== confirm) {
      setStatus('error');
      setErrorMessage('Passwords do not match.');
      return;
    }
    setStatus('sending');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/confirm-forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, new_password: password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Unable to reset password.');
      }
      setStatus('sent');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Unable to reset password.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/25 to-white text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-12">
        <Card className="shadow-xl shadow-emerald-100 border-emerald-100">
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Reset token</Label>
                <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={status === 'sending'}>
                {status === 'sending' ? 'Updating...' : 'Update password'}
              </Button>
              {status === 'sent' ? (
                <p className="text-xs text-emerald-700">Password updated. Redirecting to sign in...</p>
              ) : null}
              {status === 'error' ? (
                <p className="text-xs text-red-600">{errorMessage}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
