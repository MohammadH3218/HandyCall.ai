'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

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

  // Redirect after successful authentication (backup redirect)
  useEffect(() => {
    const ensureSessionValid = async () => {
      if ((status === 'authenticated' || isAuthenticated) && !requiresPasswordChange && !showPasswordChangeModal) {
        const sessionRole =
          ((session as any)?.userRole as UserRole | undefined) ||
          ((session as any)?.user?.role as UserRole | undefined) ||
          userRole;
        const poolType = (session as any)?.poolType as string | undefined;
        const derivedRole =
          sessionRole ||
          (poolType === 'admin' ? UserRole.ADMIN : undefined);

        try {
          if (derivedRole === UserRole.ADMIN) {
            const accessToken = (session as any)?.accessToken as string | undefined;
            const idToken = (session as any)?.idToken as string | undefined;
            const refreshToken = (session as any)?.refreshToken as string | undefined;

            if (accessToken && idToken && refreshToken) {
              useAuthStore.getState().setTokens(accessToken, idToken, refreshToken);
            }

            const sessionEmail = (session as any)?.user?.email as string | undefined;
            if (sessionEmail) {
              localStorage.setItem('email', sessionEmail);
            }
            localStorage.setItem('user_role', UserRole.ADMIN);

            router.push(callbackUrl || '/admin');
            return;
          }

          // Wait until we know the role to avoid hitting customer endpoints with admin tokens
          if (!derivedRole) {
            return;
          }

          await apiClient.getMyCompany();
          router.push(callbackUrl || '/dashboard');
        } catch (err) {
          await signOut({ callbackUrl: '/login' });
          return;
        }
      }
    };
    ensureSessionValid();
  }, [status, isAuthenticated, userRole, requiresPasswordChange, showPasswordChangeModal, router, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // First, hit backend directly to detect password challenge and pool type
      const prelogin = await apiClient.login({ email, password } as any);

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

      // Use NextAuth credentials with manual navigation to avoid callback loops
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Invalid email or password');
      } else {
        // Successful login - decide destination based on session role
        const session = await getSession();
        await checkAuth();
        const role =
          (session as any)?.user?.role as UserRole | undefined ||
          (session as any)?.userRole as UserRole | undefined;
        const poolType = (session as any)?.poolType as string | undefined;
        const derivedRole =
          role ||
          (poolType === 'admin' ? UserRole.ADMIN : undefined);

        if (derivedRole === UserRole.ADMIN) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
    // Loading ends on navigation or after error above
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
      // After password change, log in to establish NextAuth session
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

      await checkAuth();
      const postSession = await getSession();
      const role =
        (postSession as any)?.user?.role as UserRole | undefined ||
        (postSession as any)?.userRole as UserRole | undefined;
      const poolType = (postSession as any)?.poolType as string | undefined;
      const derivedRole =
        role ||
        (poolType === 'admin' ? UserRole.ADMIN : undefined);

      // Close modal and reset form
      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmPassword('');
      if (loginResult?.url) {
        router.push(loginResult.url);
        return;
      }

      if (derivedRole === UserRole.ADMIN) {
        router.push(callbackUrl || '/admin');
      } else {
        router.push(callbackUrl || '/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center justify-center space-y-4">
          <Logo variant="words" width={240} height={60} />
          <p className="text-base text-center text-muted-foreground font-medium">AI Receptionist for Your Business</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </CardFooter>
          </form>
        </Card>

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

                <div className="rounded-md bg-secondary p-3 text-sm text-muted-foreground border border-border">
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
      </div>
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
