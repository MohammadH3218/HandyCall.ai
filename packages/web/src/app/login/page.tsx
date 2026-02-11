'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { useSession, getSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/stores/auth-store';
import { UserRole } from '@handycall/shared';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

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

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || undefined;
  const { status, data: session } = useSession();
  const { login, changePassword, requiresPasswordChange, passwordChangeSession, passwordChangePoolType, email: storeEmail, isAuthenticated, userRole, checkAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'cognito-google' | 'cognito-apple' | null>(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [smsRequired, setSmsRequired] = useState(false);
  const [smsVerificationId, setSmsVerificationId] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/login') return;
    const userPortalUrl = process.env.NEXT_PUBLIC_USER_PORTAL_URL;
    if (!userPortalUrl) return;
    try {
      const target = new URL(userPortalUrl);
      if (window.location.host === target.host) return;
      const nextUrl = new URL(window.location.href);
      nextUrl.protocol = target.protocol;
      nextUrl.host = target.host;
      window.location.replace(nextUrl.toString());
    } catch {
      // ignore invalid portal URL
    }
  }, []);

  // Sync email from store if available (for password change flow)
  useEffect(() => {
    if (storeEmail) {
      setEmail(storeEmail);
    }
  }, [storeEmail]);

  // Show modal if password change is required
  useEffect(() => {
    if (requiresPasswordChange) {
      setShowPasswordChangeModal(true);
    }
  }, [requiresPasswordChange]);

  const finalizeLogin = async (overrideEmail?: string) => {
    // Successful login - wait for session to be established before checking auth
    let session = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!session && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 200 * (attempts + 1)));
      session = await getSession();
      attempts++;
    }

    if (!session) {
      setError('Login successful but session could not be established. Please try again.');
      setIsLoading(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    await checkAuth();

    const state = useAuthStore.getState();
    if (!state.isAuthenticated) {
      await new Promise(resolve => setTimeout(resolve, 300));
      await checkAuth();
    }

    const role =
      (session as any)?.user?.role as UserRole | undefined ||
      (session as any)?.userRole as UserRole | undefined;
    const poolType = (session as any)?.poolType as string | undefined;
    const derivedRole =
      role ||
      (poolType === 'admin' ? UserRole.ADMIN : undefined);

    if (overrideEmail) {
      useAuthStore.setState({ email: overrideEmail });
    }

    if (derivedRole === UserRole.ADMIN) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  // Clear any invalid/stale sessions when landing on login page
  useEffect(() => {
    const clearStaleSession = async () => {
      // If user is already authenticated and on login page, they might be trying to re-login
      // Don't auto-redirect them - let them explicitly log in again if they want
      if (status === 'authenticated') {
        try {
          const latestSession = await getSession();
          const accessToken = (latestSession as any)?.accessToken as string | undefined;
          const idToken = (latestSession as any)?.idToken as string | undefined;

          // Only clear if we truly have no valid tokens
          if (!accessToken && !idToken) {
            console.log('[Login] No valid tokens found, clearing session');
            await signOut({ redirect: false });
          }
        } catch (err) {
          console.error('[Login] Error checking session:', err);
        }
      }
    };

    clearStaleSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSmsMessage('');

    if (smsRequired) {
      await handleVerifySms();
      return;
    }

    setIsLoading(true);

    try {
      const prelogin = await apiClient.requestLoginSms(email, password);

      if (prelogin?.requiresPasswordChange && prelogin.session) {
        useAuthStore.setState({
          requiresPasswordChange: true,
          passwordChangeSession: prelogin.session,
          passwordChangePoolType: (prelogin.poolType as any) || 'users',
          email,
          userRole: prelogin.userRole || null,
          isAuthenticated: false,
          isLoading: false,
        });
        setShowPasswordChangeModal(true);
        setIsLoading(false);
        return;
      }

      if (prelogin?.skipSms) {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error || 'Invalid email or password');
          setIsLoading(false);
          return;
        }

        await finalizeLogin(email);
        return;
      }

      if (prelogin?.session) {
        setSmsRequired(true);
        setSmsVerificationId(prelogin.session);
        setSmsCode('');
        setSmsMessage(
          'Verification code sent to your phone.'
        );
        setIsLoading(false);
        return;
      }

      setError('Unable to start SMS verification. Please try again.');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }

    setIsLoading(false);
  };

  const handleVerifySms = async () => {
    setError('');
    if (!smsVerificationId) {
      setError('Send an SMS code to continue.');
      return;
    }
    if (!smsCode.trim()) {
      setError('Enter the verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        sms_code: smsCode.trim(),
        verification_id: smsVerificationId,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Verification failed.');
        setIsLoading(false);
        return;
      }

      await finalizeLogin(email);
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
      setIsLoading(false);
    }
  };

  const handleResendSms = async () => {
    setError('');
    setSmsMessage('');
    setIsLoading(true);
    try {
      const prelogin = await apiClient.requestLoginSms(email, password);
      if (prelogin?.session) {
        setSmsVerificationId(prelogin.session);
        setSmsCode('');
        setSmsMessage(
          'Verification code sent to your phone.'
        );
      } else if (prelogin?.skipSms) {
        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.error) {
          setError(result.error || 'Invalid email or password');
          setIsLoading(false);
          return;
        }
        await finalizeLogin(email);
        return;
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to resend code.');
    }
    setIsLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!passwordChangeSession) {
      setError('Session expired. Please login again.');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(email, newPassword, passwordChangeSession!, passwordChangePoolType || undefined);
      setPassword(newPassword);
      const prelogin = await apiClient.requestLoginSms(email, newPassword);

      if (prelogin?.skipSms) {
        const loginResult = await signIn('credentials', {
          email,
          password: newPassword,
          redirect: false,
        });

        if (loginResult?.error) {
          setError(loginResult.error);
          setIsLoading(false);
          return;
        }

        setShowPasswordChangeModal(false);
        setNewPassword('');
        setConfirmPassword('');
        await finalizeLogin(email);
        return;
      }

      if (prelogin?.session) {
        setShowPasswordChangeModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setSmsRequired(true);
        setSmsVerificationId(prelogin.session);
        setSmsMessage('Verification code sent to your phone.');
        setIsLoading(false);
        return;
      }

      setError('Unable to start SMS verification. Please try again.');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'cognito-google' | 'cognito-apple') => {
    setError('');
    setSocialLoading(provider);
    try {
      const result = await signIn(provider, { callbackUrl: callbackUrl || '/dashboard' });
      if (result?.error) {
        setError(result.error);
        setSocialLoading(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to start social sign-in.');
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <SiteHeader hideLogin />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-12">
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge className="bg-primary/10 text-primary">Welcome back</Badge>
              <h1 className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
                Sign in and let HandyCall handle the phones.
              </h1>
              <p className="text-lg text-muted-foreground">
                Keep every caller answered, every lead captured, and every appointment confirmed. Log in to manage your
                agents, review transcripts, and monitor performance.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: '24/7 coverage',
                  desc: 'AI answers in ~2 seconds with your approved scripts and pricing rules.',
                },
                {
                  title: 'Real-time insights',
                  desc: 'Transcripts, call summaries, and lead capture in one dashboard.',
                },
                {
                  title: 'Smart scheduling',
                  desc: 'Book jobs based on your availability and send confirmations automatically.',
                },
                {
                  title: 'Follow-up ready',
                  desc: 'Automated SMS recaps and reminders to keep prospects warm.',
                },
              ].map((item) => (
                <Card key={item.title} className="border-emerald-100 bg-white/80 shadow-sm">
                  <CardContent className="space-y-1 p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-100/60 via-white to-emerald-50 blur-2xl" />
            <div className="relative">
              <div className="mb-6 flex flex-col items-center justify-center space-y-3">
                <Logo variant="words" width={220} height={54} />
                <p className="text-sm font-medium text-muted-foreground">Secure login to your HandyCall workspace</p>
              </div>

              <Card className="shadow-xl shadow-emerald-100">
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>Access your dashboard to manage calls, leads, and bookings.</CardDescription>
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
                        onClick={() => handleSocialSignIn('cognito-google')}
                        disabled={isLoading || Boolean(socialLoading)}
                        className="flex items-center justify-center gap-2"
                      >
                        <GoogleIcon className="h-4 w-4" />
                        {socialLoading === 'cognito-google' ? 'Connecting to Google...' : 'Continue with Google'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialSignIn('cognito-apple')}
                        disabled={isLoading || Boolean(socialLoading)}
                        className="flex items-center justify-center gap-2"
                      >
                        <AppleIcon className="h-4 w-4" />
                        {socialLoading === 'cognito-apple' ? 'Connecting to Apple...' : 'Continue with Apple'}
                      </Button>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="h-px flex-1 bg-border" />
                        <span>or sign in with email</span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@business.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading || smsRequired}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading || smsRequired}
                      />
                      <div className="text-right">
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    {smsRequired && (
                      <div className="space-y-2">
                        <Label htmlFor="sms-code">SMS verification code</Label>
                        <Input
                          id="sms-code"
                          value={smsCode}
                          onChange={(e) => setSmsCode(e.target.value)}
                          placeholder="Enter code"
                          disabled={isLoading}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={handleResendSms}
                            className="text-primary hover:underline"
                            disabled={isLoading}
                          >
                            Resend code
                          </button>
                          {smsMessage && <span>{smsMessage}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => {
                              setSmsRequired(false);
                              setSmsVerificationId(null);
                              setSmsCode('');
                              setSmsMessage('');
                            }}
                            className="text-primary hover:underline"
                            disabled={isLoading}
                          >
                            Use a different email or password
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading
                        ? smsRequired
                          ? 'Verifying...'
                          : 'Signing in...'
                        : smsRequired
                          ? 'Verify & sign in'
                          : 'Sign In'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      New to HandyCall?{' '}
                      <Link href="/register" className="font-semibold text-primary hover:underline">
                        Create an account
                      </Link>
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      <Dialog open={showPasswordChangeModal} onOpenChange={setShowPasswordChangeModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Your account requires a password change. Please set a new password to continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="rounded-md border border-border bg-secondary p-3 text-sm text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, and numbers.
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Changing password...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <SiteFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
