'use client';

import { MarketplaceProfileEditor } from '@/components/marketplace/marketplace-profile-editor';
import { PageHeader } from '@/components/portal/page-header';

export default function MarketplaceProfileDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Public profile"
        subtitle="Update the profile customers see when they browse or message your business."
      />
      <MarketplaceProfileEditor mode="dashboard" />
    </div>
  );
}
