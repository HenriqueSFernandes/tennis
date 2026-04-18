import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authClient } from "./lib/auth";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Log user state changes
  useEffect(() => {
    console.log(
      "[Auth] user state changed:",
      user,
      "isAuthenticated:",
      user !== null,
    );
  }, [user]);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      console.log("[Auth] checkSession started, current user:", user);
      try {
        const { data } = await authClient.getSession();
        console.log(
          "[Auth] getSession returned:",
          data,
          "| Setting user to:",
          data?.user ?? null,
        );
        setUser((data?.user as User | null) ?? null);
      } catch (err) {
        console.log("[Auth] getSession error:", err, "| Setting user to: null");
        setUser(null);
      } finally {
        console.log("[Auth] Setting isLoading to false");
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          return { error: result.error.message };
        }

        // Refresh user session
        const { data } = await authClient.getSession();
        setUser((data?.user as User | null) ?? null);
        return {};
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Sign in failed",
        };
      }
    },
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
    ): Promise<{ error?: string }> => {
      try {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (result.error) {
          return { error: result.error.message };
        }

        // Refresh user session
        const { data } = await authClient.getSession();
        setUser((data?.user as User | null) ?? null);
        return {};
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Sign up failed",
        };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{
    error?: string;
  }> => {
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/`,
      });

      if (result.error) {
        return { error: result.error.message };
      }

      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Google sign in failed",
      };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authClient.getSession();
      setUser((data?.user as User | null) ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
