'use client';

import { ReactNode } from 'react';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import PageLoading from '@/components/common/PageLoading';

// Middleware already blocks unauthenticated requests to company-protected
// routes server-side. This gate only covers the client-side gap between a
// protected page mounting and CompanyAuthContext finishing its async
// initAuth() (which populates `company`/`currentUser` from the cookie-backed
// PocketBase authStore) — without it, pages that key their own data-fetching
// off `company?.id` briefly render as empty/blank instead of showing a
// loading state, since `initialLoading` was previously checked one level up
// by the now-removed ProtectedCompanyRoute wrapper.
export default function CompanyAuthGate({ children }: { children: ReactNode }) {
  const { initialLoading, isAuthenticated } = useCompanyAuth();

  if (initialLoading && !isAuthenticated) {
    return <PageLoading />;
  }

  return children;
}
