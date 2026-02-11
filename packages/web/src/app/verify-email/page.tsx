'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email') || '';
  const codeParam = searchParams?.get('code') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(codeParam);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const canAutoVerify = useMemo(() => Boolean(emailParam && codeParam), [emailParam, codeParam]);

  useEffect(() => {
    setEmail(emailParam);
    if (!code) {
      setCode(codeParam);
    }
  }, [emailParam, codeParam, code]);

  useEffect(() => {
    if (!canAutoVerify) return;
    const run = async () => {
      setIsSubmitting(true);
      setError('');
      try {
        await apiClient.confirmSignUp({ email: emailParam, code: codeParam });
        setSuccess('Email verified successfully. You can now sign in.');
        setTimeout(() => {
          router.replace('/login');
        }, 1200);
      } catch (err: any) {
        setError(err?.message || 'Verification failed. Please enter the code from your email.');
      } finally {
        setIsSubmitting(false);
      }
    };
    void run();
  }, [canAutoVerify, emailParam, codeParam, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim() || !code.trim()) {
      setError('Please enter your email and verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.confirmSignUp({ email: email.trim(), code: code.trim() });
      setSuccess('Email verified successfully. You can now sign in.');
      setTimeout(() => {
        router.replace('/login');
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Enter your email to resend the verification code.');
      return;
    }
    setIsResending(true);
    try {
      await apiClient.resendConfirmation({ email: email.trim() });
      setSuccess('Verification email sent. Check your inbox for the code.');
    } catch (err: any) {
      setError(err?.message || 'Unable to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-foreground">
      <SiteHeader ctaLabel="Login" ctaHref="/login" hideLoginLink />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-12">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="space-y-3 text-center">
            <Badge className="bg-emerald-100 text-emerald-700">Verify your email</Badge>
            <h1 className="text-3xl font-bold text-slate-900">Check your inbox</h1>
            <p className="text-sm text-slate-600">
              We sent a verification code to your email. Enter it below to activate your account.
            </p>
          </div>

          <Card className="shadow-xl shadow-emerald-100">
            <CardHeader>
              <CardTitle>Email verification</CardTitle>
              <CardDescription>Once verified, you can sign in and continue setup.</CardDescription>
            </CardHeader>
            <form onSubmit={handleVerify}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Verifying...' : 'Verify email'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already verified?{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
