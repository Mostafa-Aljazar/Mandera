'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const PublicHeader = () => {
  const { isAuthenticated } = useCompanyAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-primary">
          <img
            src="https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png"
            alt={t('platformName')}
            className="h-10 w-auto object-contain"
          />
          <span className="font-bold text-xl tracking-tight font-outfit hidden sm:block">{t('platformName')}</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {t('Home')}
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">
              {language === 'ar' ? 'English' : 'العربية'}
            </span>
          </Button>

          {isAuthenticated ? (
            <Link href="/company-dashboard">
              <Button variant="default">{t('Dashboard')}</Button>
            </Link>
          ) : (
            <Link href="/company-login">
              <Button variant="default">{t('Company Login')}</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;