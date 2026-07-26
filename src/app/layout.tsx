import './globals.css';
import type { Metadata } from 'next';
import Providers from '@/components/common/Providers';
import LandingFooter from '@/components/landing/LandingFooter';

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
        <Providers>
          <div className="flex flex-col min-h-screen">
            <div className="flex-1">{children}</div>
            <LandingFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
