'use client';

import { ReactNode } from 'react';
import { useMasterAuth } from '@/contexts/MasterAuthContext';

// See CompanyAuthGate.jsx for rationale — same pattern for master-admin routes.
export default function MasterAuthGate({ children }: { children: ReactNode }) {
  const { initialLoading } = useMasterAuth();

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return children;
}
