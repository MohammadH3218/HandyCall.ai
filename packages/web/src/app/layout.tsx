import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AmplifyProvider } from '@/components/providers/amplify-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HandyCall - AI Receptionist for Local Service Businesses',
  description: 'Automated call handling, lead capture, and appointment scheduling for your business',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
