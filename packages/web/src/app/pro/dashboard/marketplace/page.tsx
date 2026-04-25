'use client';

import { MarketplaceProfileEditor } from '@/components/marketplace/marketplace-profile-editor';

export default function ProDashboardMarketplacePage() {
  return (
    <div className="px-8 py-10">
      <MarketplaceProfileEditor mode="dashboard" />
    </div>
  );
}
