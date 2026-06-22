import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { getStoredTokens, isSessionExpired, clearTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const checkSession = useCallback(async () => {
    const { access } = getStoredTokens();
    if (!access || isSessionExpired()) {
      clearTokens();
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.getCurrentUser();
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const onExpired = () => {
      setSessionExpired(true);
      setUser(null);
    };
    window.addEventListener('crpms:session-expired', onExpired);
    return () => window.removeEventListener('crpms:session-expired', onExpired);
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    setSessionExpired(false);
    setUser({ username: data.username, full_name: data.full_name });
    return data;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sessionExpired, setSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
