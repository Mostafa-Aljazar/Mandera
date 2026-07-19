"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import supabase from "@/lib/supabase/client";
import type { AuthUser } from "@/types/supabase-entities.types";

interface MasterAuthContextValue {
  currentUser: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
  initialLoading: boolean;
}

const MasterAuthContext = createContext<MasterAuthContextValue | null>(null);

export const MasterAuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "master_admin") {
          setCurrentUser({ ...profile, email: session.user.email } as AuthUser);
        }
      }
      setInitialLoading(false);
    };

    initAuth();
  }, []);

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
