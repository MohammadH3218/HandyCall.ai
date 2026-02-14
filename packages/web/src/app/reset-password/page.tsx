'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/marketing/site-header';

const maskEmail = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.includes('@')) return trimmed;
  const [local, domain] = trimmed.split('@');
  if (!local || !domain) return trimmed;
  const maskedLocal = local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
};

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
  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  useEffect(() => {
    if (!emailParam && !tokenParam) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('email');
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
  }, [emailParam, tokenParam]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    if (!email || !token) {
      setStatus('error');
      setErrorMessage('Reset link is missing or expired. Please request a new one.');
      return;
    }
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
                <Label>Email</Label>
                <Input value={maskedEmail || 'Unknown'} readOnly />
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
