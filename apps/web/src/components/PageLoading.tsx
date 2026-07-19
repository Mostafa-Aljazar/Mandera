'use client';

import { useTranslation } from 'react-i18next';

interface PageLoadingProps {
  label?: string;
}

export default function PageLoading({ label }: PageLoadingProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">{label ?? t('Loading...')}</p>
      </div>
    </div>
  );
}
