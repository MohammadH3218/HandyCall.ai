'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/stores/auth-store';
import { UserRole } from '@handycall/shared';

export default function LoginPage() {
  const router = useRouter();
  const { login, changePassword, requiresPasswordChange, passwordChangeSession, passwordChangePoolType, email: storeEmail, isAuthenticated, userRole } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  // Determine if company name is required (only for users pool, not admin)
  const requiresCompanyName = passwordChangePoolType === 'users';

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
    if (isAuthenticated && !requiresPasswordChange && !showPasswordChangeModal) {
      if (userRole === UserRole.ADMIN) {
        router.push('/admin');
      } else if (userRole === 'customer') {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, userRole, requiresPasswordChange, showPasswordChangeModal, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result && result.requiresPasswordChange) {
        setShowPasswordChangeModal(true);
      } else {
        // Get userRole from store after login (more reliable than result)
        const userRole = useAuthStore.getState().userRole;
        
        // Redirect based on user role
        if (userRole === UserRole.ADMIN) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
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

    // Company name is required only for users pool (not admin)
    if (requiresCompanyName && !companyName.trim()) {
      setError('Company name is required');
      return;
    }

    // First and last name validation (only for users pool)
    if (requiresCompanyName && !firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (requiresCompanyName && !lastName.trim()) {
      setError('Last name is required');
      return;
    }

    if (!passwordChangeSession) {
      setError('Session expired. Please login again.');
      return;
    }

    setIsLoading(true);

    try {
      // Only send company_name for users pool
      const companyNameToSend = requiresCompanyName ? companyName.trim() : undefined;
      const firstNameToSend = requiresCompanyName ? firstName.trim() : undefined;
      const lastNameToSend = requiresCompanyName ? lastName.trim() : undefined;
      await changePassword(email, newPassword, passwordChangeSession!, passwordChangePoolType || undefined, companyNameToSend, firstNameToSend, lastNameToSend);
      // Close modal and reset form
      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setCompanyName('');
      setFirstName('');
      setLastName('');
      // Get user role from store after password change
      const userRole = useAuthStore.getState().userRole;
      if (userRole === UserRole.ADMIN) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
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
                Your account requires a password change. Please set a new password for your account.
                {requiresCompanyName && ' You will also need to provide your name and company name.'}
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

                {/* Company Name, First Name, Last Name - Only for users pool, not admin */}
                {requiresCompanyName && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input
                        id="first-name"
                        type="text"
                        placeholder="Enter your first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input
                        id="last-name"
                        type="text"
                        placeholder="Enter your last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        type="text"
                        placeholder="Enter your company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}

                <div className="rounded-md bg-secondary p-3 text-sm text-muted-foreground border border-border">
                  Password must be at least 8 characters with uppercase, lowercase, and numbers.
                  {requiresCompanyName && ' Please also provide your name and company name.'}
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
