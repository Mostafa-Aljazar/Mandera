import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'MANDERA CRM',
  icons: {
    icon: 'https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
