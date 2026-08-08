import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MASTER_LOGIN = "/master/login";
const COMPANY_LOGIN = "/company/login";

const MASTER_PROTECTED_PREFIXES = ["/master/dashboard", "/master/legal-pages"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isCompanyProtected(pathname: string) {
  if (pathname === COMPANY_LOGIN || pathname.startsWith(`${COMPANY_LOGIN}/`)) {
    return false;
  }
  return pathname === "/company" || pathname.startsWith("/company/");
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

function mapLegacyPath(pathname: string) {
  if (pathname === "/master-login" || pathname.startsWith("/master-login/")) {
    return pathname.replace("/master-login", MASTER_LOGIN);
  }

  if (
    pathname === "/master-dashboard" ||
    pathname.startsWith("/master-dashboard/")
  ) {
    return pathname.replace("/master-dashboard", "/master/dashboard");
  }

  if (
    pathname === "/admin/legal-pages" ||
    pathname.startsWith("/admin/legal-pages/")
  ) {
    return pathname.replace("/admin/legal-pages", "/master/legal-pages");
  }

  if (pathname === "/company" || pathname === "/company/") {
    return "/company/dashboard";
  }

  if (pathname === "/company-login" || pathname.startsWith("/company-login/")) {
    return pathname.replace("/company-login", COMPANY_LOGIN);
  }

  if (
    pathname === "/company-dashboard" ||
    pathname.startsWith("/company-dashboard/")
  ) {
    // /company-dashboard/employees → /company/employees
    if (
      pathname === "/company-dashboard/employees" ||
      pathname.startsWith("/company-dashboard/employees/")
    ) {
      return pathname.replace("/company-dashboard/employees", "/company/employees");
    }
    return pathname.replace("/company-dashboard", "/company/dashboard");
  }

  const companyModuleMap: Record<string, string> = {
    "/employees": "/company/employees",
    "/clients": "/company/clients",
    "/owners": "/company/owners",
    "/properties": "/company/properties",
    "/revenue": "/company/revenue",
    "/settings": "/company/settings",
  };

  for (const [from, to] of Object.entries(companyModuleMap)) {
    if (pathname === from || pathname.startsWith(`${from}/`)) {
      return pathname.replace(from, to);
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const legacyPath = mapLegacyPath(request.nextUrl.pathname);
  if (legacyPath) {
    return redirectTo(request, legacyPath);
  }

  const { pathname } = request.nextUrl;

  const isMasterRoute = matchesPrefix(pathname, MASTER_PROTECTED_PREFIXES);
  const isCompanyRoute = isCompanyProtected(pathname);

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Server Action POSTs target the page route, so they pass through here too —
  // whatever this function costs is paid again on every action the page fires.
  // getClaims() verifies the token's ES256 signature locally against the cached
  // JWKS (~1ms) instead of getUser()'s ~210ms round-trip to the auth server, and
  // still refreshes an expired session via getSession(), so the rotated cookies
  // land on `response` through setAll above.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    const loginPath = isMasterRoute ? MASTER_LOGIN : COMPANY_LOGIN;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const isManagerOnlyPath =
    pathname === "/company/revenue" ||
    pathname.startsWith("/company/revenue/") ||
    pathname === "/company/employees" ||
    pathname.startsWith("/company/employees/") ||
    pathname === "/company/settings" ||
    pathname.startsWith("/company/settings/");

  // `role` is not a JWT claim, so reading it costs a query. Only the routes that
  // actually gate on role pay for it. General company routes don't need it: the
  // four roles are master_admin plus the three company roles, and the action
  // layer already admits master_admin to company data (see assertCompanyMember),
  // so the old identity check redirected nobody it hadn't already authorized.
  if (!isMasterRoute && !isManagerOnlyPath) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (isMasterRoute) {
    if (profile?.role !== "master_admin") {
      return NextResponse.redirect(new URL(MASTER_LOGIN, request.url));
    }
    return response;
  }

  if (profile?.role !== "manager") {
    return NextResponse.redirect(new URL("/company/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/master-login",
    "/master-login/:path*",
    "/master-dashboard",
    "/master-dashboard/:path*",
    "/admin/legal-pages",
    "/admin/legal-pages/:path*",
    "/master/dashboard/:path*",
    "/master/legal-pages/:path*",
    "/company-login",
    "/company-login/:path*",
    "/company-dashboard",
    "/company-dashboard/:path*",
    "/company",
    "/company/:path*",
    "/employees",
    "/employees/:path*",
    "/settings",
    "/settings/:path*",
    "/owners",
    "/owners/:path*",
    "/properties",
    "/properties/:path*",
    "/clients",
    "/clients/:path*",
    "/revenue",
    "/revenue/:path*",
  ],
};
