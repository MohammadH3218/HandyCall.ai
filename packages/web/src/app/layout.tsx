import type { Metadata } from 'next';
import { Manrope, Space_Grotesk, Lora, IBM_Plex_Mono } from 'next/font/google';
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
const lora = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://handycall.org';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'HandyCall — Home Services in Riyadh',
    template: '%s | HandyCall',
  },
  description:
    'Find home services in Riyadh by category and district. Browse AC repair, plumbing, electrical, cleaning, painting, carpentry, landscaping, and more.',
  keywords: [
    'riyadh home services',
    'riyadh ac repair',
    'riyadh plumber',
    'riyadh electrician',
    'riyadh cleaning',
    'riyadh painting',
    'riyadh carpentry',
    'riyadh landscaping',
    'riyadh district services',
    'riyadh neighborhood services',
    'riyadh handyman',
    'riyadh home maintenance',
    'handycall',
  ],
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'HandyCall',
    title: 'HandyCall — Home Services in Riyadh',
    description:
      'Browse home service categories in Riyadh, compare options, and search by district.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HandyCall — Home Services in Riyadh',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HandyCall — Home Services in Riyadh',
    description: 'Browse home service categories in Riyadh and search by district.',
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
      <body className={`${manrope.variable} ${spaceGrotesk.variable} ${lora.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
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
