import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
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
    const loginPath = isMasterRoute ? '/master-login' : '/company-login';
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (isMasterRoute) {
    if (profile?.role !== 'master_admin') {
      return NextResponse.redirect(new URL('/master-login', request.url));
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
