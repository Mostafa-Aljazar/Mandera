'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import pb from '@/lib/pocketbaseClient';
import type { MasterAdmin } from '../../types/pocketbase.types';

interface MasterAuthContextValue {
  currentUser: MasterAdmin | null;
  login: (email: string, password: string) => Promise<MasterAdmin>;
  logout: () => void;
  isAuthenticated: boolean;
  initialLoading: boolean;
}

const MasterAuthContext = createContext<MasterAuthContextValue | null>(null);

export const MasterAuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<MasterAdmin | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model?.role === 'master_admin') {
      setCurrentUser(pb.authStore.model as unknown as MasterAdmin);
    }
    setInitialLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await pb.collection('master_admins').authWithPassword(email, password, { $autoCancel: false });
    if (authData.record.role !== 'master_admin') {
      pb.authStore.clear();
      throw new Error('Invalid credentials');
    }
    setCurrentUser(authData.record as unknown as MasterAdmin);
    return authData.record as unknown as MasterAdmin;
  };

  const logout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
  };

  const value: MasterAuthContextValue = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
    initialLoading
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
    throw new Error('useMasterAuth must be used within MasterAuthProvider');
  }
  return context;
};
