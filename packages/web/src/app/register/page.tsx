'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

const SETUP_STEPS = [
  'Choose a plan and payment method',
  'Configure business profile + hours',
  'Set service area and knowledge base',
  'Connect calendar and phone routing',
];

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.9-6.9C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.04 6.24C12.6 13.09 17.86 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.43-4.74H24v9h12.7c-.55 3-2.2 5.55-4.7 7.27l7.2 5.6C43.94 36.5 46.5 30.8 46.5 24z" />
    <path fill="#FBBC05" d="M10.6 28.46c-.48-1.44-.76-2.98-.76-4.46s.27-3.02.76-4.46l-8.04-6.24C.92 16.16 0 19.97 0 24c0 4.03.92 7.84 2.56 11.2l8.04-6.24z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.77l-7.2-5.6c-2 1.35-4.56 2.13-8.7 2.13-6.14 0-11.4-3.59-13.4-8.72l-8.04 6.24C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="currentColor" d="M16.7 12.3c0-2.1 1.7-3.1 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.4 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.3 0 1.7.7 3 .7 1.2 0 2-.9 2.7-2 .9-1.3 1.2-2.6 1.2-2.7-.1 0-2.3-.9-2.3-3.9z" />
    <path fill="currentColor" d="M14.9 4.2c.6-.7 1-1.7.9-2.7-.9.1-1.9.6-2.5 1.3-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.5-1.3z" />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'cognito-google' | 'cognito-apple' | null>(null);

  const handleSocialSignUp = async (provider: 'cognito-google' | 'cognito-apple') => {
    setError('');
    setSocialLoading(provider);

    try {
      const result = await signIn(provider, { callbackUrl: '/onboarding/profile' });
      if (result?.error) {
        setError(result.error);
        setSocialLoading(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to start social sign up.');
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const trimmedName = fullName.trim();
      if (!trimmedName) {
        setError('Full name is required.');
        setIsSubmitting(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsSubmitting(false);
        return;
      }

      const nameParts = trimmedName.split(' ').filter(Boolean);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      await apiClient.register({
        email: email.trim(),
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });

      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader ctaLabel="Login" ctaHref="/login" hideLoginLink />

      <main className="mx-auto grid min-h-[calc(100vh-128px)] w-full max-w-[980px] items-center gap-8 px-6 py-10 lg:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          <Badge variant="secondary" className="w-fit">Start onboarding</Badge>
          <h1 className="text-3xl font-semibold text-foreground">Create your workspace</h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Setup is focused and fast. You can launch with core routing and booking rules in one session.
          </p>

          <div className="space-y-2">
            {SETUP_STEPS.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-md border border-border bg-[#0f1115] px-3 py-2 text-sm text-muted-foreground">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-[#13161b] text-xs text-foreground">
                  {index + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Use email and password. We will send a verification code next.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleSocialSignUp('cognito-google')}
                  disabled={isSubmitting || Boolean(socialLoading)}
                >
                  <GoogleIcon className="h-4 w-4" />
                  {socialLoading === 'cognito-google' ? 'Connecting...' : 'Continue with Google'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleSocialSignUp('cognito-apple')}
                  disabled={isSubmitting || Boolean(socialLoading)}
                >
                  <AppleIcon className="h-4 w-4" />
                  {socialLoading === 'cognito-apple' ? 'Connecting...' : 'Continue with Apple'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jordan Rivera"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                By continuing, you agree to our terms and privacy policy.
              </p>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}

