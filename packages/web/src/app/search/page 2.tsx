import { Suspense } from 'react';
import { SearchPageClient } from '@/components/marketing/pages/SearchPageClient';

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageClient />
    </Suspense>
  );
}
