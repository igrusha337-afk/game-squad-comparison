import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  house_id?: number | null;
  house_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  makeAdmin: (secret: string) => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem('session_id'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('session_id', data.session_id);
    setUser(data.user);
  };

  const register = async (username: string, email: string, password: string, confirmPassword: string) => {
    const data = await authApi.register({ username, email, password, confirmPassword });
    localStorage.setItem('session_id', data.session_id);
    setUser(data.user);
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('session_id');
    setUser(null);
  };

  const makeAdmin = async (secret: string) => {
    const data = await authApi.makeAdmin(secret);
    if (user) setUser({ ...user, is_admin: true });
    return data;
  };

  const updateUser = (data: Partial<User>) => {
    if (user) setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, makeAdmin, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}