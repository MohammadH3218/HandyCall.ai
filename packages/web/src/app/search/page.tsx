import { Metadata } from 'next';
import { SearchPageClient } from '@/components/marketing/pages/SearchPageClient';

export const metadata: Metadata = {
  title: 'Find Service Pros in Saudi Arabia — HandyCall',
  description:
    'Search verified home service professionals across Riyadh, Jeddah, Dammam and all major Saudi cities.',
};

export default function SearchPage() {
  return <SearchPageClient />;
}
