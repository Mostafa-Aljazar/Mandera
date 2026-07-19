import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const MASTER_LOGIN = '/master/login';
const MASTER_PROTECTED_PREFIXES = ['/master/dashboard', '/master/legal-pages'];
const COMPANY_PROTECTED_PREFIXES = [
  '/company-dashboard',
  '/employees',
  '/settings',
  '/owners',
  '/properties',
  '/clients',
  '/revenue',
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

function mapLegacyMasterPath(pathname: string) {
  if (pathname === '/master-login' || pathname.startsWith('/master-login/')) {
    return pathname.replace('/master-login', MASTER_LOGIN);
  }

  if (pathname === '/master-dashboard' || pathname.startsWith('/master-dashboard/')) {
    return pathname.replace('/master-dashboard', '/master/dashboard');
  }

  if (pathname === '/admin/legal-pages' || pathname.startsWith('/admin/legal-pages/')) {
    return pathname.replace('/admin/legal-pages', '/master/legal-pages');
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const legacyPath = mapLegacyMasterPath(request.nextUrl.pathname);
  if (legacyPath) {
    return redirectTo(request, legacyPath);
  }

  const { pathname } = request.nextUrl;

  const isMasterRoute = matchesPrefix(pathname, MASTER_PROTECTED_PREFIXES);
  const isCompanyRoute = matchesPrefix(pathname, COMPANY_PROTECTED_PREFIXES);

  if (!isMasterRoute && !isCompanyRoute) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginPath = isMasterRoute ? MASTER_LOGIN : '/company-login';
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (isMasterRoute) {
    if (profile?.role !== 'master_admin') {
      return NextResponse.redirect(new URL(MASTER_LOGIN, request.url));
    }
    return response;
  }

  if (isCompanyRoute) {
    const isCompanyIdentity =
      profile?.role === 'company_super_admin' || profile?.role === 'company_employee';

    if (!isCompanyIdentity) {
      return NextResponse.redirect(new URL('/company-login', request.url));
    }

    // Tenant business-rule checks (is_frozen / isActive / subscriptionEndDate)
    // intentionally stay in CompanyAuthContext on the client: they require an
    // extra `companies` fetch, and duplicating that in middleware on every
    // request would add latency to every protected navigation. Middleware
    // here only enforces "is this a valid, correctly-scoped session".
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/master-login',
    '/master-login/:path*',
    '/master-dashboard',
    '/master-dashboard/:path*',
    '/admin/legal-pages',
    '/admin/legal-pages/:path*',
    '/master/dashboard/:path*',
    '/master/legal-pages/:path*',
    '/company-dashboard/:path*',
    '/employees/:path*',
    '/settings/:path*',
    '/owners/:path*',
    '/properties/:path*',
    '/clients/:path*',
    '/revenue/:path*',
  ],
};
