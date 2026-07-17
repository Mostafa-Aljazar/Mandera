'use client';

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '@/config/i18n.js'; // Initialize i18n before any context that uses it
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from '@/components/ScrollToTop.jsx';
import { LanguageProvider } from '@/contexts/LanguageContext.jsx';
import { MasterAuthProvider } from '@/contexts/MasterAuthContext.jsx';
import { CompanyAuthProvider } from '@/contexts/CompanyAuthContext.jsx';

function TitleSync() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('platformName');
  }, [t, i18n.language]);

  return null;
}

export default function Providers({ children }) {
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
