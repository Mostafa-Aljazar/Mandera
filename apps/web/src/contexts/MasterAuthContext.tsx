"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import supabase from "@/lib/supabase/client";
import type { AuthUser } from "@/types/supabase-entities.types";

const MASTER_AUTH_PATHS = ["/master"];

function needsMasterAuth(pathname: string) {
  return MASTER_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

interface MasterAuthContextValue {
  currentUser: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
  initialLoading: boolean;
}

const MasterAuthContext = createContext<MasterAuthContextValue | null>(null);

export const MasterAuthProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const shouldInit = needsMasterAuth(pathname);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [initialLoading, setInitialLoading] = useState(shouldInit);

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
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (profile?.role === "master_admin") {
        setCurrentUser({ ...profile, email: session.user.email } as AuthUser);
      }

      setInitialLoading(false);
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, shouldInit]);

  const login = async (email: string, password: string) => {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Invalid credentials");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || profile?.role !== "master_admin") {
      await supabase.auth.signOut();
      throw new Error("Invalid credentials");
    }

    const user = { ...profile, email: authData.user.email } as AuthUser;
    setCurrentUser(user);
    setInitialLoading(false);
    return user;
  };

  const logout = () => {
    supabase.auth.signOut();
    setCurrentUser(null);
  };

  const value: MasterAuthContextValue = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
    initialLoading,
  };

  return (
    <MasterAuthContext.Provider value={value}>
      {children}
    </MasterAuthContext.Provider>
  );
};

export const useMasterAuth = () => {
  const context = useContext(MasterAuthContext);
  if (!context) {
    throw new Error("useMasterAuth must be used within MasterAuthProvider");
  }
  return context;
};
