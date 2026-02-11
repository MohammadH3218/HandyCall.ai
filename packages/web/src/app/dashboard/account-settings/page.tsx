'use client';

import { useEffect, useMemo, useState } from 'react';
import { signOut } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/portal/page-header';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@handycall/shared';

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const { company, email: storeEmail, user: storeUser, setCompany } = useAuthStore();
  const [user, setUser] = useState<User | null>(storeUser);
  const [profileDraft, setProfileDraft] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact_email: '',
  });
  const [companyDraft, setCompanyDraft] = useState({
    company_name: '',
    email: '',
  });
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<number | null>(null);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let mounted = true;
    apiClient
      .getMyUser()
      .then((data) => {
        if (!mounted) return;
        setUser(data);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(storeUser || null);
      });
    return () => {
      mounted = false;
    };
  }, [storeUser]);

  useEffect(() => {
    const firstName = user?.first_name || storeUser?.first_name || '';
    const lastName = user?.last_name || storeUser?.last_name || '';
    const email = user?.email || storeEmail || '';
    const contactEmail = (user as any)?.contact_email || '';
    setProfileDraft({
      first_name: firstName,
      last_name: lastName,
      email,
      contact_email: contactEmail,
    });
    setPhoneDraft(user?.phone_number || '');
    setPhoneVerifiedAt((user as any)?.phone_verified_at || null);
  }, [user, storeUser, storeEmail]);

  useEffect(() => {
    if (!company) return;
    setCompanyDraft({
      company_name: company.company_name || '',
      email: company.email || '',
    });
  }, [company]);

  const phoneStatus = useMemo(() => {
    if (!phoneVerifiedAt) return 'Not verified';
    return `Verified on ${new Date(phoneVerifiedAt).toLocaleDateString()}`;
  }, [phoneVerifiedAt]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const updated = await apiClient.updateMyProfile({
        first_name: profileDraft.first_name.trim() || undefined,
        last_name: profileDraft.last_name.trim() || undefined,
        email: profileDraft.email.trim() || undefined,
        contact_email: profileDraft.contact_email.trim() || undefined,
      });

      setUser(updated);
      useAuthStore.setState({
        user: updated,
        email: updated?.email || storeEmail,
      });

      const emailChanged =
        updated?.email &&
        storeEmail &&
        updated.email.toLowerCase() !== storeEmail.toLowerCase();

      toast({
        title: 'Profile updated',
        description: emailChanged
          ? 'Email updated. Please sign in again.'
          : 'Your account details were saved.',
      });

      if (emailChanged) {
        await signOut({ callbackUrl: '/login' });
      }
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update your profile.',
        variant: 'destructive',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!company) return;
    setCompanySaving(true);
    try {
      const updated = await apiClient.updateMyCompany({
        company_name: companyDraft.company_name.trim(),
        email: companyDraft.email.trim(),
      });
      setCompany(updated);
      toast({
        title: 'Company updated',
        description: 'Company details saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update company details.',
        variant: 'destructive',
      });
    } finally {
      setCompanySaving(false);
    }
  };

  const handleSendPhoneCode = async () => {
    setPhoneMessage('');
    if (!phoneDraft.trim()) {
      setPhoneMessage('Enter a phone number first.');
      return;
    }
    setPhoneSending(true);
    try {
      const response = await apiClient.sendPhoneUpdateCode(phoneDraft.trim());
      setPhoneCode('');
      const delivery = response?.code_delivery_details || response?.CodeDeliveryDetails;
      const destination = delivery?.Destination || delivery?.destination;
      setPhoneMessage(destination ? `Verification code sent to ${destination}.` : 'Verification code sent.');
    } catch (error: any) {
      setPhoneMessage(error?.message || 'Unable to send verification code.');
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhone = async () => {
    setPhoneMessage('');
    if (!phoneCode.trim()) {
      setPhoneMessage('Enter the verification code.');
      return;
    }
    setPhoneVerifying(true);
    try {
      const updated = await apiClient.verifyPhoneUpdateCode(phoneCode.trim());
      setUser(updated);
      useAuthStore.setState({ user: updated });
      setPhoneVerifiedAt((updated as any)?.phone_verified_at || Date.now());
      setPhoneMessage('Phone number verified and updated.');
      setPhoneCode('');
    } catch (error: any) {
      setPhoneMessage(error?.message || 'Verification failed.');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill out all password fields.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }
    setPasswordSaving(true);
    try {
      await apiClient.updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update password.',
        variant: 'destructive',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Account"
        title="Account settings"
        subtitle="Update your login details, phone number, and company information."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Keep your name and email up to date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={profileDraft.first_name}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={profileDraft.last_name}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profileDraft.email}
              onChange={(e) => setProfileDraft((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact email (optional)</Label>
            <Input
              id="contact_email"
              type="email"
              value={profileDraft.contact_email}
              onChange={(e) => setProfileDraft((prev) => ({ ...prev, contact_email: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phone verification</CardTitle>
          <CardDescription>SMS verification protects your login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone number</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="phone_number"
                value={phoneDraft}
                onChange={(e) => {
                  setPhoneDraft(e.target.value);
                  setPhoneCode('');
                }}
                placeholder="+15551234567"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendPhoneCode}
                disabled={phoneSending}
              >
                {phoneSending ? 'Sending...' : 'Send code'}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_code">Verification code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="phone_code"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="Enter code"
              />
              <Button
                type="button"
                onClick={handleVerifyPhone}
                disabled={phoneVerifying}
              >
                {phoneVerifying ? 'Verifying...' : 'Verify & save'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Status: {phoneStatus}</p>
          {phoneMessage && <p className="text-xs text-slate-500">{phoneMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdatePassword} disabled={passwordSaving}>
              {passwordSaving ? 'Saving...' : 'Update password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
          <CardDescription>Update company name and contact email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company name</Label>
            <Input
              id="company_name"
              value={companyDraft.company_name}
              onChange={(e) => setCompanyDraft((prev) => ({ ...prev, company_name: e.target.value }))}
              disabled={!company}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_email">Company email</Label>
            <Input
              id="company_email"
              type="email"
              value={companyDraft.email}
              onChange={(e) => setCompanyDraft((prev) => ({ ...prev, email: e.target.value }))}
              disabled={!company}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveCompany} disabled={companySaving || !company}>
              {companySaving ? 'Saving...' : 'Save company'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
