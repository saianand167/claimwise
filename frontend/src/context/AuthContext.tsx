import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('claimwise_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('claimwise_user');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (nextToken: string, nextUser: User) => {
    localStorage.setItem('claimwise_token', nextToken);
    localStorage.setItem('claimwise_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
    return data.user;
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    persist(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('claimwise_token');
    localStorage.removeItem('claimwise_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

