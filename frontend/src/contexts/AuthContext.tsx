import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import api from '@/services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    const stored = localStorage.getItem('pos_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const { data } = await api.post('/login', { email, password });
      localStorage.setItem('pos_token', data.token);
      const u: User = {
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        shopId: data.user.shop_id ?? null,
        branchId: data.user.branch_id ?? null,
      };
      localStorage.setItem('pos_user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch {
      return null;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/logout');
    } catch {
      // best-effort
    } finally {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
