'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Globe } from 'lucide-react';

const CATEGORIES = [
  'Plumbing', 'HVAC', 'Electrical', 'Pest Control',
  'Cleaning', 'Landscaping', 'Roofing', 'Painting',
  'Appliance Repair', 'Handyman',
];

export default function MarketplacePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    public_slug: '',
    public_description: '',
    categories: [] as string[],
    city: '',
    state: '',
    years_in_business: '',
    license_number: '',
    booking_link: '',
    is_public: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getMyMarketplaceProfile();
        if (data) {
          setForm({
            public_slug: data.public_slug || '',
            public_description: data.public_description || '',
            categories: data.categories || [],
            city: data.city || '',
            state: data.state || '',
            years_in_business: data.years_in_business ? String(data.years_in_business) : '',
            license_number: data.license_number || '',
            booking_link: data.booking_link || '',
            is_public: Boolean(data.is_public),
          });
        }
      } catch { /* profile may not exist yet */ }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateMarketplaceProfile({
        ...form,
        years_in_business: form.years_in_business ? Number(form.years_in_business) : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Marketplace Profile" subtitle="Manage your public listing on HandyCall.ai" />
        <div className="mt-8 animate-pulse space-y-4">
          <div className="h-48 rounded-2xl bg-white shadow-sm" />
          <div className="h-64 rounded-2xl bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Marketplace Profile"
        subtitle="Manage how your business appears on the HandyCall.ai consumer marketplace"
      />

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Profile saved. Changes will appear publicly within a few minutes.
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {form.public_slug && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm">
          <Globe className="h-4 w-4 text-emerald-600" />
          <span className="text-muted-foreground">Public profile:</span>
          <a
            href={`/find-pros/${form.public_slug}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-emerald-600 hover:underline"
          >
            handycall.ai/find-pros/{form.public_slug}
          </a>
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <h2 className="font-semibold text-slate-900">Basic Info</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Public Slug (URL)</Label>
              <Input
                id="slug"
                placeholder="your-business-name"
                value={form.public_slug}
                onChange={(e) => setForm((f) => ({ ...f, public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
              />
              <p className="text-xs text-muted-foreground">Used in your public URL. Letters, numbers, hyphens only.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="booking_link">Booking Link</Label>
              <Input
                id="booking_link"
                type="url"
                placeholder="https://..."
                value={form.booking_link}
                onChange={(e) => setForm((f) => ({ ...f, booking_link: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Los Angeles"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="CA"
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="years">Years in Business</Label>
              <Input
                id="years"
                type="number"
                min={0}
                placeholder="5"
                value={form.years_in_business}
                onChange={(e) => setForm((f) => ({ ...f, years_in_business: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="license">License Number</Label>
              <Input
                id="license"
                placeholder="LIC-123456"
                value={form.license_number}
                onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Business Description</Label>
            <textarea
              id="desc"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Tell customers about your business, experience, and what sets you apart..."
              value={form.public_description}
              onChange={(e) => setForm((f) => ({ ...f, public_description: e.target.value }))}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">Service Categories</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const selected = form.categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                    selected
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Visibility</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Make your profile searchable on the public marketplace
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_public: !f.is_public }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_public ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.is_public ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
