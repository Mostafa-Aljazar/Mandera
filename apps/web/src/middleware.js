import { NextResponse } from 'next/server';
import { getServerPocketbase } from '@/lib/pocketbaseServer';

const MASTER_PROTECTED_PREFIXES = ['/master-dashboard', '/admin/legal-pages'];
const COMPANY_PROTECTED_PREFIXES = [
  '/company-dashboard',
  '/employees',
  '/settings',
  '/owners',
  '/properties',
  '/clients',
  '/revenue',
];

function matchesPrefix(pathname, prefixes) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get('cookie') || '';

  const isMasterRoute = matchesPrefix(pathname, MASTER_PROTECTED_PREFIXES);
  const isCompanyRoute = matchesPrefix(pathname, COMPANY_PROTECTED_PREFIXES);

  if (!isMasterRoute && !isCompanyRoute) {
    return NextResponse.next();
  }

  const pb = getServerPocketbase(cookieHeader);

  if (isMasterRoute) {
    const model = pb.authStore.model;
    if (!pb.authStore.isValid || model?.role !== 'master_admin') {
      return NextResponse.redirect(new URL('/master-login', request.url));
    }
    return NextResponse.next();
  }

  if (isCompanyRoute) {
    const model = pb.authStore.model;
    const isCompanyIdentity =
      model?.collectionName === 'company_super_admins' ||
      model?.collectionName === 'company_employees';

    if (!pb.authStore.isValid || !isCompanyIdentity) {
      return NextResponse.redirect(new URL('/company-login', request.url));
    }

    // Tenant business-rule checks (is_frozen / isActive / subscriptionEndDate)
    // intentionally stay in CompanyAuthContext on the client: they require an
    // extra `companies` fetch, and duplicating that in middleware on every
    // request would add latency to every protected navigation. Middleware
    // here only enforces "is this a valid, correctly-scoped session" —
    // the same identity check ProtectedCompanyRoute performed before.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/master-dashboard/:path*',
    '/admin/legal-pages/:path*',
    '/company-dashboard/:path*',
    '/employees/:path*',
    '/settings/:path*',
    '/owners/:path*',
    '/properties/:path*',
    '/clients/:path*',
    '/revenue/:path*',
  ],
};
