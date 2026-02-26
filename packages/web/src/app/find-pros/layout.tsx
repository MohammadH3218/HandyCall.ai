import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Local Home Service Pros Near You',
  description:
    'Search local plumbers, electricians, HVAC techs, cleaners, and more in your area. Filter by service type and availability.',
  openGraph: {
    title: 'Find Home Service Pros | HandyCall',
    description: 'Browse local providers, compare service coverage, and book appointments online.',
  },
};

export default function FindProsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
