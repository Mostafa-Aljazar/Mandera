'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { LogOut, Banknote, Globe } from 'lucide-react';

const CompanyAdminHeader = () => {
  const { logout, company, currentUser } = useCompanyAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/company-login');
  };

  const isSuperAdmin = currentUser?.role === 'company_super_admin';

  return (
    <header className="border-b bg-card sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/company-dashboard" className="flex items-center gap-3">
              <img 
                src="https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png" 
                alt={t('platformName')} 
                className="h-8"
              />
              <span className="font-bold text-lg tracking-tight text-primary font-outfit hidden sm:block">
                {t('platformName')}
              </span>
            </Link>
            {company && (
              <div className="border-s border-border ps-4 hidden md:block">
                <p className="text-sm font-semibold text-foreground/80">{company.company_name}</p>
              </div>
            )}
          </div>
          <nav className="flex items-center gap-4 sm:gap-6">
            {isSuperAdmin && (
              <Link
                href="/revenue"
                className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${pathname.includes('/revenue') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                <Banknote className="h-4 w-4" />
                <span className="hidden sm:inline">{t('Revenue')}</span>
              </Link>
            )}
            
            <div className="flex items-center gap-2 border-s border-border ps-4">
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

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4 rtl:rotate-180" />
                <span className="hidden sm:inline">{t('Logout')}</span>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default CompanyAdminHeader;