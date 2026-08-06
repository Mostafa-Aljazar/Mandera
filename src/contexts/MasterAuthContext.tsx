"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
  setCurrentUser: (user: AuthUser | null) => void;
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
  const queryClient = useQueryClient();
  // See CompanyAuthContext's logout() for why this exists: it lets the
  // next page skip getSession(), which would otherwise queue behind the
  // in-flight signOut() network call and stall the login spinner.
  const justLoggedOutRef = useRef(false);

  useEffect(() => {
    if (!shouldInit) {
      setInitialLoading(false);
      return;
    }

    if (justLoggedOutRef.current) {
      justLoggedOutRef.current = false;
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
    justLoggedOutRef.current = true;
    setCurrentUser(null);
    queryClient.cancelQueries();
    supabase.auth.signOut({ scope: "local" });
  };

  const value: MasterAuthContextValue = {
    currentUser,
    setCurrentUser,
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
