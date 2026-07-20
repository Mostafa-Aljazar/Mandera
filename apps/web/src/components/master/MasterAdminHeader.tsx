'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useMasterAuth } from '@/contexts/MasterAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { LogOut, Building2, Globe, FileText, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOGO_URL =
  'https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png';

export default function MasterAdminHeader() {
  const { logout } = useMasterAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/master/login');
  };

  const navItems = [
    {
      href: '/master/dashboard',
      label: t('master_nav_dashboard'),
      icon: LayoutDashboard,
      match: (path: string) =>
        path === '/master/dashboard' || path === '/master/dashboard/',
    },
    {
      href: '/master/dashboard/companies',
      label: t('master_nav_companies'),
      icon: Building2,
      match: (path: string) => path.startsWith('/master/dashboard/companies'),
    },
    {
      href: '/master/legal-pages',
      label: t('master_nav_legal'),
      icon: FileText,
      match: (path: string) => path.startsWith('/master/legal-pages'),
    },
  ];

  return (
    <header className="top-0 z-50 sticky bg-background/85 supports-[backdrop-filter]:bg-background/75 backdrop-blur-md border-border/50 border-b">
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-r from-transparent via-primary/70 to-transparent h-px pointer-events-none"
        aria-hidden
      />

      <div className="mx-auto px-4 container">
        <div className="flex justify-between items-center gap-3 h-[68px]">
          <Link href="/master/dashboard" className="group flex items-center gap-2.5 min-w-0 shrink-0">
            <span className="flex justify-center items-center bg-primary/[0.08] group-hover:bg-primary/[0.12] border border-primary/10 group-hover:border-primary/20 rounded-xl w-10 h-10 transition-colors">
              <img
                src={LOGO_URL}
                alt={t('platformName')}
                className="w-auto h-7 object-contain"
              />
            </span>
            <span className="hidden sm:block font-outfit font-bold text-foreground text-lg truncate tracking-tight">
              {t('platformName')}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 bg-muted/50 shadow-[var(--shadow-subtle)] p-1 border border-border/60 rounded-full">
            {navItems.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-medium text-sm transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="max-w-[9rem] lg:max-w-none truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="md:hidden flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon, match }) => {
                const active = match(pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    className={cn(
                      'flex justify-center items-center rounded-lg w-9 h-9 transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-1.5 px-2 sm:px-3 h-9 text-muted-foreground hover:text-foreground"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">
                {language === 'ar' ? t('language_switch_en') : t('language_switch_ar')}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 px-2 sm:px-3 border-border/60 rounded-lg h-9"
            >
              <LogOut className="w-4 h-4 rtl:rotate-180" />
              <span className="hidden sm:inline">{t('Logout')}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
