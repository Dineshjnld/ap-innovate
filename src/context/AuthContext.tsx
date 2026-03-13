import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getSession,
  hydrateAuthSession,
  refreshAuthSession,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  subscribeAuthSession,
  updateSessionUser,
  type AuthSession,
  type SignInInput,
  type SignUpInput,
} from "@/services/auth";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(getSession());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeAuthSession((nextSession) => {
      if (!active) {
        return;
      }
      setSession(nextSession);
    });

    void hydrateAuthSession().finally(() => {
      if (active) {
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.refreshToken) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshAuthSession();
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [session?.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isLoading,
      signIn: async (input: SignInInput) => {
        const nextSession = await signInRequest(input);
        setSession(nextSession);
      },
      signUp: async (input: SignUpInput) => {
        const nextSession = await signUpRequest(input);
        setSession(nextSession);
      },
      signOut: () => {
        signOutRequest();
        setSession(null);
      },
      updateProfile: (updates) => {
        const nextSession = updateSessionUser(updates);
        if (nextSession) {
          setSession(nextSession);
        }
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
