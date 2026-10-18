import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoginResponse, User, Verify2FAResponse } from '@/types/auth';
import {
  authStorage,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  verify2FA as apiVerify2FA,
} from '@/services/apiClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMatrizOperator: boolean;
  login: (username: string, pass: string) => Promise<LoginResponse>;
  verify2FA: (tempToken: string, code: string) => Promise<Verify2FAResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
      authStorage.removeToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogin = async (username: string, pass: string): Promise<LoginResponse> => {
    const res = await apiLogin(username, pass);
    if (res.access_token) {
      await fetchUser();
    }
    return res;
  };

  const handleVerify2FA = async (tempToken: string, code: string): Promise<Verify2FAResponse> => {
    const res = await apiVerify2FA(tempToken, code);
    if (res.access_token) {
      await fetchUser();
    }
    return res;
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
  };

  const roles = user?.roles || [];
  const isAdmin = Boolean(user?.is_superadmin || roles.includes('admin'));
  const isMatrizOperator = Boolean(roles.includes('operador_matriz'));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isMatrizOperator,
        login: handleLogin,
        verify2FA: handleVerify2FA,
        logout: handleLogout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
