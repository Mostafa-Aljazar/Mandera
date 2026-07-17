'use client';

import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';

// Middleware already blocks unauthenticated requests to company-protected
// routes server-side. This gate only covers the client-side gap between a
// protected page mounting and CompanyAuthContext finishing its async
// initAuth() (which populates `company`/`currentUser` from the cookie-backed
// PocketBase authStore) — without it, pages that key their own data-fetching
// off `company?.id` briefly render as empty/blank instead of showing a
// loading state, since `initialLoading` was previously checked one level up
// by the now-removed ProtectedCompanyRoute wrapper.
export default function CompanyAuthGate({ children }) {
  const { initialLoading } = useCompanyAuth();

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
