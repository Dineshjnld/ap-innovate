import { useEffect, useMemo, useRef, useState } from "react";
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
import { socketService } from "@/services/socket";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(getSession);
  const [isLoading, setIsLoading] = useState(true);
  // Prevent duplicate hydration calls across StrictMode double-invoke
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;

    // Subscribe to cross-tab / BroadcastChannel session changes
    const unsubscribe = subscribeAuthSession((nextSession) => {
      if (active) {
        setSession(nextSession);
      }
    });

    // Only hydrate once
    if (!hydrated.current) {
      hydrated.current = true;
      
      // Fast-boot safety timeout: stop loading if backend doesn't respond in 1s
      const timeout = setTimeout(() => {
        if (active) setIsLoading(false);
      }, 1000);

      void hydrateAuthSession()
        .then((nextSession) => {
          if (active) {
            setSession(nextSession);
          }
        })
        .catch((err) => {
          console.error("Hydration error:", err);
        })
        .finally(() => {
          clearTimeout(timeout);
          if (active) {
            setIsLoading(false);
          }
        });
    } else {
      // If already hydrated (React 18 double-mount), just clear loading
      setIsLoading(false);
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Proactive token refresh every 60 s (only when we have an API-backed session)
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
  }, [session?.refreshToken, session?.token]);

  // Connect/authenticate socket when user session exists
  useEffect(() => {
    if (session?.user?.id) {
      socketService.connect(session.user.id);
    } else {
      socketService.disconnect();
    }
  }, [session?.user?.id]);

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
        socketService.disconnect();
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
