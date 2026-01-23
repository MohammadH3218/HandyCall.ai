'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function SettingsPage() {
  const { company } = useAuthStore();
  const [formData, setFormData] = useState({
    company_name: '',
    phone_number: '',
    timezone: '',
    service_area_zipcodes: [] as string[],
  });
  const [zipInput, setZipInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [myNumber, setMyNumber] = useState<string | null>(null);

  const statusLabel = company?.cancel_at_period_end
    ? 'Cancelled'
    : company?.status
      ? company.status.charAt(0) + company.status.slice(1).toLowerCase()
      : 'Inactive';

  useEffect(() => {
    if (!company) return;
    setFormData({
      company_name: company.company_name,
      phone_number: company.phone_number ?? '',
      timezone: company.timezone,
      service_area_zipcodes: (company as any).service_area_zipcodes ?? [],
    });
  }, [company]);

  useEffect(() => {
    apiClient
      .getMyTelephonyNumber()
      .then((res: any) => {
        const phone =
          res?.phoneNumber ??
          res?.phone_number ??
          res?.data?.phoneNumber ??
          res?.data?.phone_number ??
          null;
        setMyNumber(phone || null);
      })
      .catch(() => setMyNumber(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      await apiClient.updateMyCompany(formData);
      setMessage('Settings saved successfully!');
    } catch (error: any) {
      setMessage('Error: ' + (error.message || 'Failed to save settings'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddZip = () => {
    const val = zipInput.trim();
    if (val && /^\d{5}$/.test(val)) {
      if (!formData.service_area_zipcodes.includes(val)) {
        setFormData((prev) => ({
          ...prev,
          service_area_zipcodes: [...prev.service_area_zipcodes, val],
        }));
      }
      setZipInput('');
    }
  };

  const handleRemoveZip = (zip: string) => {
    setFormData((prev) => ({
      ...prev,
      service_area_zipcodes: prev.service_area_zipcodes.filter((z) => z !== zip),
    }));
  };

  const handleZipKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddZip();
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your business information and preferences</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Update your company details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div
                  className={`rounded-md p-3 text-sm ${message.includes('Error')
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-green-50 text-green-700'
                    }`}
                >
                  {message}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="company_name">Business Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Business Contact Phone (optional)</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Your subscription information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm text-gray-600">{statusLabel}</span>
              </div>
              {company?.trial_ends_at && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Trial Ends:</span>
                  <span className="text-sm text-gray-600">
                    {new Date(company.trial_ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company phone number</CardTitle>
            <CardDescription>This is the phone number customers call to reach your AI receptionist.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Inbound number</div>
                <div className="text-sm text-gray-600">{myNumber ?? 'Not assigned yet'}</div>
              </div>
            </div>

            {!myNumber && (
              <div className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3">
                Phone numbers are assigned by the HandyCall team. If you need a number, contact support and we’ll set it
                up for you.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Area</CardTitle>
            <CardDescription>
              Restrict bookings to specific zip codes. Leave empty to allow all areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter 5-digit Zip Code"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                  onKeyDown={handleZipKeyDown}
                  maxLength={5}
                />
                <Button type="button" onClick={handleAddZip} variant="secondary">
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.service_area_zipcodes.length === 0 && (
                  <span className="text-sm text-gray-500 italic">Open Territory (All zip codes allowed)</span>
                )}
                {formData.service_area_zipcodes.map((zip) => (
                  <Badge key={zip} variant="outline" className="text-sm py-1 px-3">
                    {zip}
                    <button
                      onClick={() => handleRemoveZip(zip)}
                      className="ml-2 hover:text-destructive focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                The AI will check this list when a customer requests service.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
