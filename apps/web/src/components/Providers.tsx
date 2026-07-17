'use client';

import React, { useEffect, ReactNode } from 'react';
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
  return (
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
  );
}
