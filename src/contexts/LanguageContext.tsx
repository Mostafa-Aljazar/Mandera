'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DirectionProvider } from '@radix-ui/react-direction';

type Language = 'en' | 'ar';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lng: string) => Promise<unknown>;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function resolveLanguage(lng: string | undefined): Language {
  return lng?.startsWith('ar') ? 'ar' : 'en';
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  const language = resolveLanguage(i18n.language);

  // After hydration, apply the user's saved language (localStorage / navigator).
  // Doing this in useEffect avoids SSR/client text mismatches.
  useEffect(() => {
    const stored = window.localStorage.getItem('i18nextLng');
    const preferred = stored
      ? resolveLanguage(stored)
      : resolveLanguage(window.navigator.language);
    if (preferred !== resolveLanguage(i18n.language)) {
      void i18n.changeLanguage(preferred);
    }
  }, [i18n]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    if (language === 'ar') {
      document.documentElement.classList.add('lang-ar');
      document.documentElement.classList.remove('lang-en');
    } else {
      document.documentElement.classList.add('lang-en');
      document.documentElement.classList.remove('lang-ar');
    }
  }, [language]);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    void i18n.changeLanguage(newLang);
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: i18n.changeLanguage, toggleLanguage }}
    >
      <DirectionProvider dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </DirectionProvider>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
