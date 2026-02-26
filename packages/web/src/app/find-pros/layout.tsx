import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Local Home Service Pros Near You',
  description:
    'Search verified plumbers, electricians, HVAC techs, cleaners, and more in your area. Filter by rating, price, and availability. Book in minutes.',
  openGraph: {
    title: 'Find Home Service Pros | HandyCall',
    description: 'Browse thousands of verified pros. Real reviews, instant booking, secure payments.',
  },
};

export default function FindProsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
