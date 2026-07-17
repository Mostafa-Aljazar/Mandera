'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import CompanyAdminHeader from '@/components/CompanyAdminHeader.jsx';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const PropertyDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();

  return (
    <>
      <Helmet>
        <title>{t('Property Details')} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />
      <main className="min-h-[calc(100vh-80px)] bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <Link href="/properties">
            <Button variant="ghost" className="mb-6 -ml-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> {t('Back to Properties')}
            </Button>
          </Link>
          <div className="bg-card rounded-2xl p-8 border shadow-sm text-center">
            <h1 className="text-2xl font-bold mb-2">{t('Property Details')}</h1>
            <p className="text-muted-foreground">{t('Detailed view for property ID:')} {id}</p>
            <p className="text-sm mt-4 text-muted-foreground/60">({t('Full property visualization would be implemented here')})</p>
          </div>
        </div>
      </main>
    </>
  );
};

export default PropertyDetailPage;
