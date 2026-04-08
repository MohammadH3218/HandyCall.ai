import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { MarketingLanguageProvider } from '@/components/providers/marketing-language-provider';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://handycall.ai';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'HandyCall — Find & Book Trusted Home Service Pros in Houston, TX',
    template: '%s | HandyCall',
  },
  description:
    'Find trusted plumbers, electricians, HVAC techs, cleaners, and handymen in Houston, TX. Serving Harris, Fort Bend, Montgomery, Brazoria, and Galveston counties. Compare pros, book fast, pay securely.',
  keywords: [
    'home services Houston TX',
    'handyman Houston',
    'Houston plumber',
    'AC repair Houston',
    'Houston electrician',
    'house cleaning Houston',
    'find a pro Houston',
    'home repair Houston',
    'The Woodlands home services',
    'Sugar Land handyman',
    'Katy TX home services',
    'Pearland home repair',
    'Humble TX handyman',
    'Houston metro home services',
    'book a plumber Houston',
    'HVAC repair Houston',
    'pest control Houston',
    'painting contractor Houston',
    'handycall',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'HandyCall',
    title: 'HandyCall — Find & Book Trusted Home Service Pros in Houston, TX',
    description:
      'Browse Houston-area pros, compare reviews and prices, and book home services in minutes. Serving the entire Houston metro.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HandyCall — Home Services Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HandyCall — Find & Book Trusted Home Service Pros',
    description: 'Browse local providers and book home services in minutes.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang/dir are set client-side by LocaleProvider for [locale] routes.
    // suppressHydrationWarning prevents React mismatch warnings when the locale layout
    // updates the attributes after SSR.
    <html suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            <MarketingLanguageProvider>
              {children}
              <Toaster />
            </MarketingLanguageProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
