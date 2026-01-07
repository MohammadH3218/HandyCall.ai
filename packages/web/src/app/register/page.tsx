'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { ServiceType, UserRole } from '@handycall/shared';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, userRole, checkAuth, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    company_name: '',
    service_type: 'HANDYMAN' as ServiceType,
    email: '',
    password: '',
    phone_number: '',
    first_name: '',
    last_name: '',
    timezone: 'America/New_York',
  });
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    checkAuth().catch(console.error);
  }, [checkAuth]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (userRole === UserRole.ADMIN) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRegistering(true);

    try {
      await register(formData);
      // Redirect will happen via useEffect when isAuthenticated becomes true
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">HandyCall</h1>
          <p className="mt-2 text-sm text-gray-600">Get started with your AI receptionist</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>Create your account to get started</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Business Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Business Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                    placeholder="Joe's Handyman Services"
                    required
                    disabled={isRegistering}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_type">Service Type</Label>
                    <select
                      id="service_type"
                      value={formData.service_type}
                      onChange={(e) => updateField('service_type', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isRegistering}
                    >
                      <option value="HANDYMAN">Handyman</option>
                      <option value="PEST_CONTROL">Pest Control</option>
                      <option value="ELECTRICIAN">Electrician</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="HVAC">HVAC</option>
                      <option value="LANDSCAPING">Landscaping</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Business Phone</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => updateField('phone_number', e.target.value)}
                      placeholder="+15551234567"
                      required
                      disabled={isRegistering}
                    />
                      <p className="text-xs text-gray-500">Format: +1234567890</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isRegistering}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Your Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      required
                      disabled={isRegistering}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      required
                      disabled={isRegistering}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="joe@example.com"
                    required
                    disabled={isRegistering}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    required
                    disabled={isRegistering}
                  />
                  <p className="text-xs text-gray-500">Minimum 8 characters</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
