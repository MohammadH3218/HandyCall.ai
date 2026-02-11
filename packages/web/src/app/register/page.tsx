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
    description: 'Connect scheduling, claim your line, and set call handling.',
  },
];

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.9-6.9C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.04 6.24C12.6 13.09 17.86 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24c0-1.64-.15-3.22-.43-4.74H24v9h12.7c-.55 3-2.2 5.55-4.7 7.27l7.2 5.6C43.94 36.5 46.5 30.8 46.5 24z"
    />
    <path
      fill="#FBBC05"
      d="M10.6 28.46c-.48-1.44-.76-2.98-.76-4.46s.27-3.02.76-4.46l-8.04-6.24C.92 16.16 0 19.97 0 24c0 4.03.92 7.84 2.56 11.2l8.04-6.24z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.9-5.77l-7.2-5.6c-2 1.35-4.56 2.13-8.7 2.13-6.14 0-11.4-3.59-13.4-8.72l-8.04 6.24C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M16.7 12.3c0-2.1 1.7-3.1 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.4 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.3 0 1.7.7 3 .7 1.2 0 2-.9 2.7-2 .9-1.3 1.2-2.6 1.2-2.7-.1 0-2.3-.9-2.3-3.9z"
    />
    <path
      fill="currentColor"
      d="M14.9 4.2c.6-.7 1-1.7.9-2.7-.9.1-1.9.6-2.5 1.3-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.5-1.3z"
    />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'cognito-google' | 'cognito-apple' | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [smsVerified, setSmsVerified] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsVerifying, setSmsVerifying] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');

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

  const handleSendSms = async () => {
    setError('');
    setSmsMessage('');
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Phone number is required.');
      return;
    }
    setSmsSending(true);
    try {
      const nameParts = trimmedName.split(' ').filter(Boolean);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      const response = await apiClient.sendRegisterSms({
        email: email.trim(),
        password,
        phone_number: phoneNumber.trim(),
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      setSmsVerified(false);
      setSmsCode('');
      const delivery = response?.code_delivery_details || response?.CodeDeliveryDetails;
      const destination = delivery?.Destination || delivery?.destination;
      setSmsMessage(destination ? `Verification code sent to ${destination}.` : 'Verification code sent.');
    } catch (err: any) {
      setError(err?.message || 'Unable to send SMS code.');
    } finally {
      setSmsSending(false);
    }
  };

  const handleVerifySms = async () => {
    setError('');
    setSmsMessage('');
    if (!smsCode.trim()) {
      setError('Enter the verification code.');
      return;
    }
    setSmsVerifying(true);
    try {
      await apiClient.verifyRegisterSms(email.trim(), smsCode.trim());
      setSmsVerified(true);
      setSmsMessage('Phone number verified.');
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setSmsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (!smsVerified) {
        setError('Verify your phone number before creating the account.');
        setIsSubmitting(false);
        return;
      }

      const nameParts = trimmedName ? trimmedName.split(' ').filter(Boolean) : [];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      await apiClient.register({
        email: email.trim(),
        password,
        phone_number: phoneNumber.trim(),
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-foreground">
      <SiteHeader ctaLabel="Login" ctaHref="/login" hideLoginLink />
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
                        className="flex items-center justify-center gap-2"
                      >
                        <GoogleIcon className="h-4 w-4" />
                        {socialLoading === 'cognito-google' ? 'Connecting to Google...' : 'Continue with Google'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialSignUp('cognito-apple')}
                        disabled={isSubmitting || Boolean(socialLoading)}
                        className="flex items-center justify-center gap-2"
                      >
                        <AppleIcon className="h-4 w-4" />
                        {socialLoading === 'cognito-apple' ? 'Connecting to Apple...' : 'Continue with Apple'}
                      </Button>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="h-px flex-1 bg-border" />
                        <span>or sign up with email</span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full name</Label>
                      <Input
                        id="full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Owner"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setSmsVerified(false);
                          setSmsCode('');
                        }}
                        placeholder="you@business.com"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="phone"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => {
                            setPhoneNumber(e.target.value);
                            setSmsVerified(false);
                            setSmsCode('');
                          }}
                          placeholder="+15551234567"
                          required
                          disabled={isSubmitting || smsSending}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendSms}
                          disabled={isSubmitting || smsSending || !phoneNumber.trim()}
                        >
                          {smsSending ? 'Sending...' : 'Send SMS code'}
                        </Button>
                      </div>
                      {smsMessage && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            id="sms-code"
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value)}
                            placeholder="Enter code"
                            disabled={isSubmitting || smsVerifying}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleVerifySms}
                            disabled={isSubmitting || smsVerifying || !smsCode.trim()}
                          >
                            {smsVerifying ? 'Verifying...' : smsVerified ? 'Verified' : 'Verify'}
                          </Button>
                        </div>
                      )}
                      {smsMessage && (
                        <p className={`text-xs ${smsVerified ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {smsMessage}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setSmsVerified(false);
                          setSmsCode('');
                        }}
                        placeholder="Minimum 8 characters"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={isSubmitting || !smsVerified}>
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
      <SiteFooter />
    </div>
  );
}
