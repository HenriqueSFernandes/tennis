import React, { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextValue {
  password: string | null;
  isUnlocked: boolean;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PASSWORD_KEY = 'rt_password';

const AUTH_URL =
  (import.meta.env.VITE_API_URL ?? 'https://api.riotinto.henriquesf.me') + '/api/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState<string | null>(() => {
    // Restore from sessionStorage so refresh doesn't require re-entry
    const stored = sessionStorage.getItem(PASSWORD_KEY);
    return stored ?? null;
  });

  const isUnlocked = password !== null;

  const unlock = useCallback(async (pwd: string): Promise<boolean> => {
    try {
      const resp = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (resp.ok) {
        setPassword(pwd);
        sessionStorage.setItem(PASSWORD_KEY, pwd);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    setPassword(null);
    sessionStorage.removeItem(PASSWORD_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ password, isUnlocked, unlock, lock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
