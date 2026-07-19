'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import '@/config/i18n'; // Initialize i18n before any context that uses it
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from '@/components/ScrollToTop';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MasterAuthProvider } from '@/contexts/MasterAuthContext';
import { CompanyAuthProvider } from '@/contexts/CompanyAuthContext';

function TitleSync() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('platformName');
  }, [t, i18n.language]);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <MasterAuthProvider>
          <CompanyAuthProvider>
            <TitleSync />
            <ScrollToTop />
            {children}
            <Toaster />
          </CompanyAuthProvider>
        </MasterAuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
