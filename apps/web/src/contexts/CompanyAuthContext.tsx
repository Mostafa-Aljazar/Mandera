"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import supabase from "@/lib/supabase/client";
import type { AuthUser, Company } from "@/types/supabase-entities.types";

const COMPANY_AUTH_PATHS = [
  "/company/login",
  "/company/dashboard",
  "/company/employees",
  "/company/settings",
  "/company/owners",
  "/company/properties",
  "/company/clients",
  "/company/revenue",
];

function needsCompanyAuth(pathname: string) {
  return COMPANY_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

type ProfileWithCompany = AuthUser & { companies: Company | Company[] | null };

interface CompanyAuthContextValue {
  currentUser: AuthUser | null;
  currentCompany: Company | null;
  company: Company | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
  initialLoading: boolean;
}

const CompanyAuthContext = createContext<CompanyAuthContextValue | null>(null);

function resolveCompany(
  companies: Company | Company[] | null | undefined,
): Company | null {
  if (!companies) return null;
  return Array.isArray(companies) ? (companies[0] ?? null) : companies;
}

export const CompanyAuthProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const shouldInit = needsCompanyAuth(pathname);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [initialLoading, setInitialLoading] = useState(shouldInit);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!shouldInit) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    setInitialLoading(true);

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        setInitialLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*, companies(*)")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (
        profile &&
        (profile.role === "company_super_admin" ||
          profile.role === "company_employee")
      ) {
        const { companies, ...profileFields } = profile as ProfileWithCompany;
        const user = { ...profileFields, email: session.user.email } as AuthUser;
        user.name = user.name || user.email || "Unknown User";

        setCurrentUser(user);
        setCurrentCompany(resolveCompany(companies));
      }

      setInitialLoading(false);
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, shouldInit]);

  const login = async (email: string, password: string) => {
    console.log(`[CompanyAuth] Starting login process for email: ${email}`);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      throw new Error(
        "Invalid email or password. Please verify your credentials.",
      );
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*, companies(*)")
        .eq("id", authData.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        (profile.role !== "company_super_admin" &&
          profile.role !== "company_employee")
      ) {
        throw new Error(
          "Invalid email or password. Please verify your credentials.",
        );
      }

      const { companies, ...profileFields } = profile as ProfileWithCompany;
      const userRecord = { ...profileFields, email: authData.user.email } as AuthUser;
      userRecord.name = userRecord.name || userRecord.email || "Unknown User";

      if (!userRecord.company_id) {
        throw new Error(
          "Your user account is not associated with any company.",
        );
      }

      const companyData = resolveCompany(companies);

      if (!companyData) {
        throw new Error(
          "An error occurred during login validation.",
        );
      }

      if (companyData.is_frozen === true) {
        const frozenMsg =
          i18n.language === "ar"
            ? "تم تجميد حساب شركتك. يرجى التواصل مع الدعم."
            : "Your company account has been frozen. Please contact support.";
        throw new Error(frozenMsg);
      }

      if (!companyData.is_active) {
        throw new Error("Company account is inactive. Please contact support.");
      }

      const now = new Date();
      const endDate = new Date(companyData.subscription_end_date);
      now.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (now > endDate) {
        throw new Error(
          "Company subscription has expired. Please contact your administrator.",
        );
      }

      console.log("[CompanyAuth] Login successful. Auth State:", {
        id: userRecord.id,
        name: userRecord.name,
        role: userRecord.role,
        companyId: userRecord.company_id,
        employeeId: userRecord.employee_id,
      });

      setCurrentUser(userRecord);
      setCurrentCompany(companyData);
      setInitialLoading(false);
      return userRecord;
    } catch (error) {
      console.error("[CompanyAuth] Validation phase failed:", error);
      await supabase.auth.signOut();
      throw new Error(
        (error as Error).message ||
          "An error occurred during login validation.",
      );
    }
  };

  const logout = () => {
    console.log("[CompanyAuth] Logging out user...");
    supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentCompany(null);
  };

  const value: CompanyAuthContextValue = {
    currentUser,
    currentCompany,
    company: currentCompany,
    login,
    logout,
    isAuthenticated: !!currentUser,
    initialLoading,
  };

  return (
    <CompanyAuthContext.Provider value={value}>
      {children}
    </CompanyAuthContext.Provider>
  );
};

export const useCompanyAuth = () => {
  const context = useContext(CompanyAuthContext);
  if (!context) {
    throw new Error("useCompanyAuth must be used within CompanyAuthProvider");
  }
  return context;
};
