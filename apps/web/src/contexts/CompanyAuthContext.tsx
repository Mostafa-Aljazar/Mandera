"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import supabase from "@/lib/supabase/client";
import type { AuthUser, Company } from "@/types/supabase-entities.types";

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

export const CompanyAuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    const initAuth = async () => {
      console.log("[CompanyAuth] Initializing auth state...");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setInitialLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (
        profile &&
        (profile.role === "company_super_admin" ||
          profile.role === "company_employee")
      ) {
        const user = { ...profile, email: session.user.email } as AuthUser;
        user.name = user.name || user.email || "Unknown User";

        console.log("[CompanyAuth] Valid user session found:", {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          employeeId: user.employee_id || "N/A",
        });

        setCurrentUser(user);

        try {
          if (user.company_id) {
            const { data: companyData } = await supabase
              .from("companies")
              .select("*")
              .eq("id", user.company_id)
              .single();
            setCurrentCompany(companyData as Company);
          }
        } catch (err) {
          console.error("[CompanyAuth] Error fetching company details:", err);
        }
      }
      setInitialLoading(false);
    };

    initAuth();
  }, []);

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
        .select("*")
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

      const userRecord = { ...profile, email: authData.user.email } as AuthUser;
      userRecord.name = userRecord.name || userRecord.email || "Unknown User";

      if (!userRecord.company_id) {
        throw new Error(
          "Your user account is not associated with any company.",
        );
      }

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", userRecord.company_id)
        .single();

      if (companyError || !companyData) {
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
      setCurrentCompany(companyData as Company);
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
