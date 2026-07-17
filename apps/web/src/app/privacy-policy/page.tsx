'use client';

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import PublicHeader from '@/components/PublicHeader';
import pb from '@/lib/pocketbaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { LegalPage } from '../../../types/pocketbase.types';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();
  const [pageData, setPageData] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const record = await pb.collection('legal_pages').getFirstListItem<LegalPage>('page_type="privacy_policy"', {
          $autoCancel: false
        });
        setPageData(record);
      } catch (err) {
        console.error("Error fetching privacy policy:", err);
        setError(t('Failed to load page content. Please try again later.'));
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [t]);

  return (
    <>
      <Helmet>
        <title>{pageData?.title || t('Privacy Policy')} | MANDERA CRM</title>
      </Helmet>

      <PublicHeader />

      <main className="min-h-[calc(100vh-140px)] bg-background">
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
          {loading ? (
            <div className="space-y-8">
              <Skeleton className="h-12 w-3/4 max-w-sm rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[95%]" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
              <div className="space-y-4 pt-8">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold text-destructive mb-2">{error}</h2>
              <p className="text-muted-foreground">{t('If the problem persists, please contact support.')}</p>
            </div>
          ) : (
            <article className="animate-in fade-in duration-500">
              <header className="mb-10">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-outfit mb-4">
                  {pageData.title}
                </h1>
                <p className="text-sm text-muted-foreground font-medium">
                  {t('Last updated:')} {format(new Date(pageData.updated), 'MMMM d, yyyy')}
                </p>
              </header>

              <div
                className="rich-text-content pb-16"
                dangerouslySetInnerHTML={{ __html: pageData.content }}
              />
            </article>
          )}
        </div>
      </main>

      <footer className="border-t bg-card py-12 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MANDERA CRM. {t('All rights reserved.')}
          </p>
        </div>
      </footer>
    </>
  );
};

export default PrivacyPolicyPage;
