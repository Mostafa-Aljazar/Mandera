"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import pb from "@/lib/pocketbaseClient";
import type { AuthUser, Company } from "../types/pocketbase.types";

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

      const model = pb.authStore.model as unknown as AuthUser | null;
      const isValid = pb.authStore.isValid;

      if (
        isValid &&
        (model?.collectionName === "company_super_admins" ||
          model?.collectionName === "company_employees")
      ) {
        // Ensure name is always populated correctly
        model.name = (model.name ||
          model.firstName ||
          model.email ||
          "Unknown User") as string;

        console.log("[CompanyAuth] Valid user session found:", {
          id: model.id,
          name: model.name,
          email: model.email,
          role: model.role,
          companyId: model.companyId,
          employeeId: model.employeeId || "N/A",
        });

        setCurrentUser(model);

        try {
          if (model.companyId) {
            const companyData = await pb
              .collection("companies")
              .getOne(model.companyId as string, { $autoCancel: false });
            setCurrentCompany(companyData as unknown as Company);
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
    let authData;
    console.log(`[CompanyAuth] Starting login process for email: ${email}`);

    try {
      authData = await pb
        .collection("company_super_admins")
        .authWithPassword(email, password, { $autoCancel: false });
      console.log("[CompanyAuth] Logged in as company_super_admin.");
    } catch (errAdmin) {
      try {
        authData = await pb
          .collection("company_employees")
          .authWithPassword(email, password, { $autoCancel: false });
        console.log("[CompanyAuth] Logged in as company_employee.");
      } catch (errEmployee) {
        throw new Error(
          "Invalid email or password. Please verify your credentials.",
        );
      }
    }

    try {
      const userRecord = authData.record as unknown as AuthUser;

      // Ensure name is always populated correctly
      userRecord.name = (userRecord.name ||
        userRecord.firstName ||
        userRecord.email ||
        "Unknown User") as string;

      if (!userRecord.companyId) {
        throw new Error(
          "Your user account is not associated with any company.",
        );
      }

      const companyData = (await pb
        .collection("companies")
        .getOne(userRecord.companyId as string, {
          $autoCancel: false,
        })) as unknown as Company;

      if (companyData.is_frozen === true) {
        const frozenMsg =
          i18n.language === "ar"
            ? "تم تجميد حساب شركتك. يرجى التواصل مع الدعم."
            : "Your company account has been frozen. Please contact support.";
        throw new Error(frozenMsg);
      }

      if (!companyData.isActive) {
        throw new Error("Company account is inactive. Please contact support.");
      }

      const now = new Date();
      const endDate = new Date(companyData.subscriptionEndDate);
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
        companyId: userRecord.companyId,
        employeeId: userRecord.employeeId,
      });

      setCurrentUser(userRecord);
      setCurrentCompany(companyData);
      return userRecord;
    } catch (error) {
      console.error("[CompanyAuth] Validation phase failed:", error);
      pb.authStore.clear();
      throw new Error(
        (error as Error).message ||
          "An error occurred during login validation.",
      );
    }
  };

  const logout = () => {
    console.log("[CompanyAuth] Logging out user...");
    pb.authStore.clear();
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
