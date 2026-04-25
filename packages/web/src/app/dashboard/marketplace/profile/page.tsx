'use client';

import { useEffect, useState } from 'react';
import { IconEye, IconLoader2, IconPhoto, IconSearch } from '@tabler/icons-react';
import { MarketplaceProfileEditor } from '@/components/marketplace/marketplace-profile-editor';
import { StatusBadge } from '@/components/admin/status-badge';
import { PageHeader } from '@/components/portal/page-header';
import { apiClient } from '@/lib/api-client';

export default function MarketplaceProfileDashboardPage() {
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiClient
      .getMyProOnboardingStatus()
      .then((response) => {
        if (!mounted) return;
        setPro(response?.pro || null);
      })
      .catch(() => {
        if (!mounted) return;
        setPro(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const workPhotoCount = Array.isArray(pro?.work_photo_s3_keys)
    ? pro.work_photo_s3_keys.length
    : 0;
  const serviceCount = Array.isArray(pro?.services_offered)
    ? pro.services_offered.length
    : 0;
  const districtCount = Array.isArray(pro?.service_districts)
    ? pro.service_districts.length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="My profile"
        subtitle="Edit the public listing customers see when they find your business in search."
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <IconLoader2 className="h-4 w-4 animate-spin text-emerald-600" stroke={1.8} />
            Loading profile status...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.6fr))]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Status
              </p>
              <div className="mt-3 flex items-center gap-3">
                <StatusBadge status={pro?.status || 'UNKNOWN'} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Profile updates may return your listing to review before customers see the latest changes.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <IconPhoto className="h-4 w-4" stroke={1.8} />
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">Work photos</p>
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{workPhotoCount}/12</p>
              <p className="mt-1 text-sm text-slate-500">Portfolio images saved</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <IconSearch className="h-4 w-4" stroke={1.8} />
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">Services</p>
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{serviceCount}</p>
              <p className="mt-1 text-sm text-slate-500">Searchable services listed</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <IconEye className="h-4 w-4" stroke={1.8} />
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">Coverage</p>
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{districtCount}</p>
              <p className="mt-1 text-sm text-slate-500">Districts selected</p>
            </div>
          </div>
        )}
      </section>

      <MarketplaceProfileEditor mode="dashboard" />
    </div>
  );
}
