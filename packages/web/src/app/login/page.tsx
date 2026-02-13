'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { useAuthStore } from '@/stores/auth-store';

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

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || undefined;
  const { status } = useSession();
  const {
    changePassword,
    requiresPasswordChange,
    passwordChangeSession,
    passwordChangePoolType,
    email: storeEmail,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'cognito-google' | 'cognito-apple' | null>(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const isAdminLogin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  const parsePasswordChangeError = (message: string) => {
    if (!message?.startsWith('NEW_PASSWORD_REQUIRED:')) return null;
    const encoded = message.split('NEW_PASSWORD_REQUIRED:')[1];
    if (!encoded) return null;

    try {
      const decoded = typeof window !== 'undefined' && typeof window.atob === 'function'
        ? window.atob(encoded)
        : Buffer.from(encoded, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (storeEmail) setEmail(storeEmail);
  }, [storeEmail]);

  useEffect(() => {
    if (requiresPasswordChange) setShowPasswordChangeModal(true);
  }, [requiresPasswordChange]);

  useEffect(() => {
    const clearStaleSession = async () => {
      if (status !== 'authenticated') return;
      try {
        const latestSession = await getSession();
        const accessToken = (latestSession as any)?.accessToken as string | undefined;
        const idToken = (latestSession as any)?.idToken as string | undefined;

        if (!accessToken && !idToken) {
          await signOut({ redirect: false });
        }
      } catch {
        // silent
      }
    };

    void clearStaleSession();
  }, [status]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl || (isAdminLogin ? '/admin' : '/dashboard'),
      });

      if (result?.error) {
        const parsed = parsePasswordChangeError(result.error);
        if (parsed?.code === 'NEW_PASSWORD_REQUIRED' && parsed?.session) {
          useAuthStore.setState({
            requiresPasswordChange: true,
            passwordChangeSession: parsed.session,
            passwordChangePoolType: parsed.poolType || 'users',
            email: parsed.email || email,
            userRole: parsed.userRole || null,
            isAuthenticated: false,
            isLoading: false,
          });
          setShowPasswordChangeModal(true);
          setIsLoading(false);
          return;
        }

        const verification =
          result.error?.includes('verify your email') || result.error?.includes('Email not verified');

        setError(verification ? 'Verify your email before signing in.' : result.error || 'Invalid credentials.');
        setNeedsVerification(verification);
        setIsLoading(false);
        return;
      }

      if (result?.url) {
        router.replace(result.url);
        return;
      }

      router.replace(callbackUrl || (isAdminLogin ? '/admin' : '/dashboard'));
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    }

    setIsLoading(false);
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!passwordChangeSession) {
      setError('Session expired. Login again.');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(email, newPassword, passwordChangeSession, passwordChangePoolType || undefined);
      const loginResult = await signIn('credentials', {
        email,
        password: newPassword,
        redirect: false,
        callbackUrl: callbackUrl || '/dashboard',
      });

      if (loginResult?.error) {
        setError(loginResult.error);
        return;
      }

      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmPassword('');

      if (loginResult?.url) {
        router.replace(loginResult.url);
        return;
      }

      router.replace(callbackUrl || (isAdminLogin ? '/admin' : '/dashboard'));
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
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
      setError(err?.message || 'Unable to start social sign in.');
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader hideLogin />

      <main className="mx-auto flex min-h-[calc(100vh-128px)] w-full max-w-[480px] items-center px-6 py-10">
        <Card className="w-full">
          <CardHeader className="space-y-2">
            <Badge variant="secondary" className="w-fit">Secure login</Badge>
            <CardTitle>Sign in to HandyCall</CardTitle>
            <CardDescription>Manage calls, messages, appointments, and routing from one dashboard.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                  {needsVerification ? (
                    <span className="mt-2 block text-sm text-primary">
                      <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="font-semibold hover:underline">
                        Verify email
                      </Link>
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleSocialSignIn('cognito-google')}
                  disabled={isLoading || Boolean(socialLoading)}
                  className="justify-center"
                >
                  <GoogleIcon className="h-4 w-4" />
                  {socialLoading === 'cognito-google' ? 'Connecting...' : 'Continue with Google'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleSocialSignIn('cognito-apple')}
                  disabled={isLoading || Boolean(socialLoading)}
                  className="justify-center"
                >
                  <AppleIcon className="h-4 w-4" />
                  {socialLoading === 'cognito-apple' ? 'Connecting...' : 'Continue with Apple'}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-faint">
                <span className="h-px flex-1 bg-border" />
                <span>Email and password</span>
                <span className="h-px flex-1 bg-border" />
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
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLoading}
                />
                <div className="text-right">
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
              <p className="text-sm text-muted-foreground">
                New here?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Create account
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>

      <Dialog open={showPasswordChangeModal} onOpenChange={setShowPasswordChangeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update password</DialogTitle>
            <DialogDescription>Set a new password before continuing.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save password'}
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

