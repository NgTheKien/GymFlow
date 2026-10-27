import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { LoginResponse, Me } from '../api/types';

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Me>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); return; }
    try {
      setUser(await api.get<Me>('/auth/me'));
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    refresh().finally(() => setLoading(false));
  }, [logout, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}

/** Dành cho trang chỉ hiển thị khi đã đăng nhập (Layout bảo đảm user khác null). */
export function useMe(): Me {
  const { user } = useAuth();
  if (!user) throw new Error('Chưa đăng nhập');
  return user;
}
