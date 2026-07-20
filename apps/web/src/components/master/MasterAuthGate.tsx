'use client';

import { ReactNode } from 'react';
import { useMasterAuth } from '@/contexts/MasterAuthContext';
import PageLoading from '@/components/common/PageLoading';

// See CompanyAuthGate.jsx for rationale — same pattern for master-admin routes.
export default function MasterAuthGate({ children }: { children: ReactNode }) {
  const { initialLoading, isAuthenticated } = useMasterAuth();

  if (initialLoading && !isAuthenticated) {
    return <PageLoading />;
  }

  return children;
}
