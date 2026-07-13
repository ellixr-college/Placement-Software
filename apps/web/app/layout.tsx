import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SwrProvider } from '../lib/swr';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Ellixr — Placement Intelligence',
  description: 'Placement Intelligence & Career Success Platform',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#3B6EF5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      {/* Browser extensions (e.g. Grammarly) inject attributes on <body> before
          hydration; suppress the resulting attribute mismatch on this element. */}
      <body className="font-sans" suppressHydrationWarning>
        <SwrProvider>{children}</SwrProvider>
      </body>
    </html>
  );
}
