import { type User } from "@/data/mockData";

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  rank: string;
  district: string;
  categories?: string[];
}

export interface AuthUser extends User {
  interests: string[];
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  user: AuthUser;
}

const SESSION_KEY = "apih_auth_session";
const AUTH_CHANNEL = "apih_auth_channel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const SESSION_REFRESH_SKEW_MS = 60 * 1000;

class AuthRequestError extends Error {
  status?: number;
  reason: "network" | "http";

  constructor(message: string, reason: "network" | "http", status?: number) {
    super(message);
    this.name = "AuthRequestError";
    this.reason = reason;
    this.status = status;
  }
}

/* ─── Session Management ─────────────────────────────────────────────────── */

const readSession = (): AuthSession | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object" || !session.token || !session.user) {
      return null;
    }
    return session as AuthSession;
  } catch {
    return null;
  }
};

const writeSession = (session: AuthSession | null) => {
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
  } else {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
};

const notifyAuthUpdate = (session: AuthSession | null) => {
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: "auth-changed", session });
    channel.close();
  } catch {
    // BroadcastChannel ignore
  }
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(new URL(path, API_BASE_URL).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthRequestError("Authentication server unreachable", "network");
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw new AuthRequestError(message, "http", response.status);
  }

  return response.json() as Promise<T>;
};

/* ─── Exports ───────────────────────────────────────────────────────────── */

export const getSession = () => readSession();

export const refreshAuthSession = async (): Promise<AuthSession | null> => {
  const current = readSession();
  if (!current?.refreshToken) return current ?? null;

  const needsRefresh = current.expiresAt && (current.expiresAt - Date.now() <= SESSION_REFRESH_SKEW_MS);
  if (!needsRefresh) return current;

  try {
    const refreshed = await postJson<AuthSession>("/api/auth/refresh", {
      refreshToken: current.refreshToken,
    });
    writeSession(refreshed);
    notifyAuthUpdate(refreshed);
    return refreshed;
  } catch {
    return current;
  }
};

export const hydrateAuthSession = async (): Promise<AuthSession | null> => {
  const current = readSession();
  if (!current) return null;
  return refreshAuthSession();
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = readSession()?.token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const signIn = async (input: SignInInput): Promise<AuthSession> => {
  const session = await postJson<AuthSession>("/api/auth/signin", {
    email: normalizeEmail(input.email),
    password: input.password,
  });
  writeSession(session);
  notifyAuthUpdate(session);
  return session;
};

export const signUp = async (input: SignUpInput): Promise<AuthSession> => {
  const session = await postJson<AuthSession>("/api/auth/signup", {
    ...input,
    email: normalizeEmail(input.email),
  });
  writeSession(session);
  notifyAuthUpdate(session);
  return session;
};

export const signOut = () => {
  const session = readSession();
  if (session?.refreshToken) {
    postJson("/api/auth/signout", { refreshToken: session.refreshToken }).catch(() => {});
  }
  writeSession(null);
  notifyAuthUpdate(null);
};

export const updateSessionUser = (updates: Partial<AuthUser>): AuthSession | null => {
  const current = readSession();
  if (!current) return null;

  const nextSession: AuthSession = {
    ...current,
    user: { ...current.user, ...updates },
  };

  writeSession(nextSession);
  notifyAuthUpdate(nextSession);
  return nextSession;
};

export const subscribeAuthSession = (onSession: (session: AuthSession | null) => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY) {
      onSession(readSession());
    }
  };

  window.addEventListener("storage", onStorage);

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.onmessage = () => onSession(readSession());
  } catch {
    channel = null;
  }

  onSession(readSession());

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
};
