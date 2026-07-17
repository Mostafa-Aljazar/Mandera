'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';

const MasterAuthContext = createContext(null);

export const MasterAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model?.role === 'master_admin') {
      setCurrentUser(pb.authStore.model);
    }
    setInitialLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const authData = await pb.collection('master_admins').authWithPassword(email, password, { $autoCancel: false });
      if (authData.record.role !== 'master_admin') {
        pb.authStore.clear();
        throw new Error('Invalid credentials');
      }
      setCurrentUser(authData.record);
      return authData.record;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
  };

  const value = {
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
