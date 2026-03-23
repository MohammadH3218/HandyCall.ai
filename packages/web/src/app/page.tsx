import { Metadata } from 'next';
import { HomePageClient } from '@/components/marketing/pages/HomePageClient';

export const metadata: Metadata = {
  title: 'HandyCall — Find Trusted Home Service Pros in Saudi Arabia',
  description:
    'Book verified plumbers, electricians, AC technicians, cleaners, and more across Riyadh, Jeddah, Dammam, and all major Saudi cities. Compare reviews and get quotes instantly.',
  openGraph: {
    title: 'HandyCall — Saudi Arabia Home Services Marketplace',
    description:
      'Find and book trusted home service professionals across Saudi Arabia. AC repair, plumbing, electrical, cleaning, and more.',
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
