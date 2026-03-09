'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    phone_number: '',
  });
  const [companyDraft, setCompanyDraft] = useState({
    company_name: '',
    email: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [passwordSending, setPasswordSending] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [companyEditing, setCompanyEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const normalizeUsPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.slice(1);
    }
    return digits.slice(0, 10);
  };
  const formatUsE164 = (digits: string) => (digits.length === 10 ? `+1${digits}` : digits);
  const resetProfileDraft = () => {
    const firstName = user?.first_name || storeUser?.first_name || '';
    const lastName = user?.last_name || storeUser?.last_name || '';
    const email = user?.email || storeEmail || '';
    const contactEmail = (user as any)?.contact_email || '';
    setProfileDraft({
      first_name: firstName,
      last_name: lastName,
      email,
      contact_email: contactEmail,
      phone_number: normalizeUsPhone(user?.phone_number || ''),
    });
  };

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
    resetProfileDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, storeUser, storeEmail]);

  useEffect(() => {
    if (!company) return;
    setCompanyDraft({
      company_name: company.company_name || '',
      email: company.email || '',
    });
  }, [company]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const phoneDigits = normalizeUsPhone(profileDraft.phone_number);
      if (phoneDigits && phoneDigits.length !== 10) {
        toast({
          title: 'Invalid phone number',
          description: 'Enter a 10-digit US phone number.',
          variant: 'destructive',
        });
        setProfileSaving(false);
        return;
      }
      const updated = await apiClient.updateMyProfile({
        first_name: profileDraft.first_name.trim() || undefined,
        last_name: profileDraft.last_name.trim() || undefined,
        email: profileDraft.email.trim() || undefined,
        contact_email: profileDraft.contact_email.trim() || undefined,
        phone_number: phoneDigits.length === 10 ? formatUsE164(phoneDigits) : undefined,
      });

      setUser(updated);
      useAuthStore.setState({
        user: updated,
        email: updated?.email || storeEmail,
      });

      const emailChanged =
        updated?.email && storeEmail && updated.email.toLowerCase() !== storeEmail.toLowerCase();

      toast({
        title: 'Profile updated',
        description: emailChanged
          ? 'Email updated. Please sign in again.'
          : 'Your account details were saved.',
      });

      if (emailChanged) {
        await signOut({ callbackUrl: '/login' });
      }
      setProfileEditing(false);
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
      setCompanyEditing(false);
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

  const handleSendPasswordReset = async () => {
    const email = storeEmail || user?.email;
    if (!email) {
      toast({
        title: 'Missing email',
        description: 'We could not find your email address for a password reset.',
        variant: 'destructive',
      });
      return;
    }
    setPasswordSending(true);
    try {
      await apiClient.requestPasswordReset(email);
      toast({
        title: 'Password reset sent',
        description: 'Check your email for a reset link.',
      });
    } catch (error: any) {
      toast({
        title: 'Request failed',
        description: error?.message || 'Could not send password reset email.',
        variant: 'destructive',
      });
    } finally {
      setPasswordSending(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!company?.company_name) return;

    if (deleteConfirmName.trim() !== company.company_name.trim()) {
      toast({
        title: 'Confirmation required',
        description: 'Enter your exact company name to confirm deletion.',
        variant: 'destructive',
      });
      return;
    }

    setDeleteSubmitting(true);
    try {
      await apiClient.deleteMyAccount();
      setDeleteDialogOpen(false);
      toast({
        title: 'Account deleted',
        description: 'Your company account and related data were removed.',
      });
      await signOut({ callbackUrl: '/login' });
    } catch (error: any) {
      toast({
        title: 'Delete account failed',
        description: error?.message || 'Could not delete this account.',
        variant: 'destructive',
      });
    } finally {
      setDeleteSubmitting(false);
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Keep your name and email up to date.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (profileEditing) {
                resetProfileDraft();
                setProfileEditing(false);
              } else {
                setProfileEditing(true);
              }
            }}
          >
            {profileEditing ? 'Cancel' : 'Edit'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={profileDraft.first_name}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, first_name: e.target.value }))
                }
                disabled={!profileEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={profileDraft.last_name}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, last_name: e.target.value }))
                }
                disabled={!profileEditing}
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
              disabled={!profileEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone number (US)</Label>
            <Input
              id="phone_number"
              value={profileDraft.phone_number}
              onChange={(e) =>
                setProfileDraft((prev) => ({
                  ...prev,
                  phone_number: normalizeUsPhone(e.target.value),
                }))
              }
              placeholder="5551234567"
              inputMode="numeric"
              type="tel"
              maxLength={10}
              disabled={!profileEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact email (optional)</Label>
            <Input
              id="contact_email"
              type="email"
              value={profileDraft.contact_email}
              onChange={(e) =>
                setProfileDraft((prev) => ({ ...prev, contact_email: e.target.value }))
              }
              disabled={!profileEditing}
            />
          </div>
          {profileEditing && (
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Send a password reset email to update your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 text-sm text-emerald-800">
            We will email you a secure link to reset your password.
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSendPasswordReset} disabled={passwordSending}>
              {passwordSending ? 'Sending...' : 'Send password reset email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Company</CardTitle>
            <CardDescription>Update company name and contact email.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (companyEditing) {
                if (company) {
                  setCompanyDraft({
                    company_name: company.company_name || '',
                    email: company.email || '',
                  });
                }
                setCompanyEditing(false);
              } else {
                setCompanyEditing(true);
              }
            }}
            disabled={!company}
          >
            {companyEditing ? 'Cancel' : 'Edit'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company name</Label>
            <Input
              id="company_name"
              value={companyDraft.company_name}
              onChange={(e) =>
                setCompanyDraft((prev) => ({ ...prev, company_name: e.target.value }))
              }
              disabled={!company || !companyEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_email">Company email</Label>
            <Input
              id="company_email"
              type="email"
              value={companyDraft.email}
              onChange={(e) => setCompanyDraft((prev) => ({ ...prev, email: e.target.value }))}
              disabled={!company || !companyEditing}
            />
          </div>
          {companyEditing && (
            <div className="flex justify-end">
              <Button onClick={handleSaveCompany} disabled={companySaving || !company}>
                {companySaving ? 'Saving...' : 'Save company'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Delete account</CardTitle>
          <CardDescription>
            Permanently remove this company and its related data. Billing- or Stripe-linked accounts
            must contact hello@handycall.org instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-100 bg-red-50/50 p-4 text-sm text-red-700">
            This deletes company data, users, calls, appointments, knowledge base entries,
            notifications, messages, invoices, and stored artifacts. This action cannot be undone.
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={!company}
            >
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmName('');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete account</DialogTitle>
            <DialogDescription>
              Type{' '}
              <span className="font-semibold text-slate-900">
                {company?.company_name || 'your company name'}
              </span>{' '}
              to confirm permanent deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-red-100 bg-red-50/50 p-4 text-sm text-red-700">
              This removes the company, users, calls, appointments, knowledge base, notifications,
              stored recordings, SMS data, invoices, and other related cloud data. Only an admin
              deletion-history record is kept.
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete_company_name">Company name</Label>
              <Input
                id="delete_company_name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={company?.company_name || ''}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                deleteSubmitting ||
                deleteConfirmName.trim() !== (company?.company_name || '').trim()
              }
            >
              {deleteSubmitting ? 'Deleting...' : 'Confirm delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
