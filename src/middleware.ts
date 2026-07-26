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

export async function middleware(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginPath = isMasterRoute ? MASTER_LOGIN : COMPANY_LOGIN;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (isMasterRoute) {
    if (profile?.role !== "master_admin") {
      return NextResponse.redirect(new URL(MASTER_LOGIN, request.url));
    }
    return response;
  }

  if (isCompanyRoute) {
    const isCompanyIdentity =
      profile?.role === "company_super_admin" ||
      profile?.role === "company_employee";

    if (!isCompanyIdentity) {
      return NextResponse.redirect(new URL(COMPANY_LOGIN, request.url));
    }

    return response;
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
