import { createContext } from "react";
import type {
  AuthSession,
  SignInInput,
  SignUpInput,
} from "@/services/auth";

export interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => void;
  updateProfile: (updates: Partial<AuthSession["user"]>) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
