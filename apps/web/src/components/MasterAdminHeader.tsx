'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useMasterAuth } from '@/contexts/MasterAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { LogOut, Building2, Globe, FileText } from 'lucide-react';

const MasterAdminHeader = () => {
  const { logout } = useMasterAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/master-login');
  };

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/master-dashboard" className="flex items-center gap-3">
            <img 
              src="https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png" 
              alt={t('platformName')} 
              className="h-8"
            />
            <span className="font-bold text-lg tracking-tight text-primary font-outfit hidden sm:block">
              {t('platformName')}
            </span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/master-dashboard/companies"
              className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${isActive('/master-dashboard/companies') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('Companies')}</span>
            </Link>
            
            <Link
              href="/admin/legal-pages"
              className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${isActive('/admin/legal-pages') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t('Legal Pages Management')}</span>
            </Link>
            
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

export default MasterAdminHeader;