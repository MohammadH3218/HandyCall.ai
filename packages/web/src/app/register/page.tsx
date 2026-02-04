'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { UserRole } from '@handycall/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteHeader } from '@/components/marketing/site-header';

const SETUP_STEPS = [
  {
    title: 'Activate subscription',
    description: 'Choose a plan and add a payment method.',
  },
  {
    title: 'Company profile',
    description: 'Company name, service type, and timezone.',
  },
  {
    title: 'Service area',
    description: 'Cities and zip codes you cover.',
  },
  {
    title: 'Knowledge base',
    description: 'Pricing, FAQs, and service details.',
  },
  {
    title: 'Calendar + phone',
    description: 'Connect scheduling and claim your line.',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, isLoading, userRole } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'cognito-google' | 'cognito-apple' | null>(null);

  useEffect(() => {
    checkAuth().catch(console.error);
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (userRole === UserRole.ADMIN) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, userRole]);

  const handleSocialSignUp = async (provider: 'cognito-google' | 'cognito-apple') => {
    setError('');
    setSocialLoading(provider);
    try {
      const result = await signIn(provider, { callbackUrl: '/onboarding' });
      if (result?.error) {
        setError(result.error);
        setSocialLoading(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to start social sign up.');
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const trimmedName = fullName.trim();
      const nameParts = trimmedName ? trimmedName.split(' ').filter(Boolean) : [];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      await apiClient.register({
        email: email.trim(),
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });

      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Unable to sign in after registration.');
        return;
      }

      let session = null;
      for (let attempt = 0; attempt < 5 && !session; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        session = await getSession();
      }

      if (!session) {
        setError('Account created, but the session could not be established. Please sign in.');
        return;
      }

      await checkAuth();
      router.push('/onboarding');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-foreground">
      <SiteHeader ctaLabel="Login" ctaHref="/login" />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-12">
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge className="bg-emerald-100 text-emerald-700">Start your HandyCall setup</Badge>
              <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                Create your account and get ready to launch.
              </h1>
              <p className="text-lg text-slate-600">
                We will guide you through subscription, company details, service area, knowledge base, calendar, and phone setup.
              </p>
            </div>

            <div className="grid gap-3">
              {SETUP_STEPS.map((step, index) => (
                <Card key={step.title} className="border-emerald-100 bg-white/80 shadow-sm">
                  <CardContent className="flex gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="text-sm text-slate-600">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-100/60 via-white to-emerald-50 blur-2xl" />
            <div className="relative">
              <Card className="shadow-xl shadow-emerald-100">
                <CardHeader>
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>Start with email and password. You will finish setup next.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-4">
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialSignUp('cognito-google')}
                        disabled={isSubmitting || Boolean(socialLoading)}
                      >
                        {socialLoading === 'cognito-google' ? 'Connecting to Google...' : 'Continue with Google'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialSignUp('cognito-apple')}
                        disabled={isSubmitting || Boolean(socialLoading)}
                      >
                        {socialLoading === 'cognito-apple' ? 'Connecting to Apple...' : 'Continue with Apple'}
                      </Button>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="h-px flex-1 bg-border" />
                        <span>or sign up with email</span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full name (optional)</Label>
                      <Input
                        id="full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Owner"
                        disabled={isSubmitting}
                      />
                    </div>

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
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
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
                      By creating an account, you agree to our terms and privacy policy.
                    </p>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <Link href="/login" className="font-semibold text-primary hover:underline">
                        Sign in
                      </Link>
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
