import { type User } from "@/data/mockData";
import { MOCK_USERS } from "@/data/mockData";

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
const RELATIONSHIPS_KEY = "apih_relationships";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const SESSION_REFRESH_SKEW_MS = 60 * 1000;
const ENABLE_LOCAL_AUTH_FALLBACK = import.meta.env.VITE_ENABLE_LOCAL_AUTH_FALLBACK === "true";

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

const createLocalSession = (user: User): AuthSession => ({
  token: `local-${Math.random().toString(36).slice(2)}`,
  expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  user: { ...user, interests: [] }
});

/* ─── Relationships (Mock) ──────────────────────────────────────────────── */

interface Relationships {
  following: string[];
  connections: string[];
  incomingRequests: string[];
  outgoingRequests: string[];
}

const readRelationships = (): Relationships => {
  try {
    const raw = window.localStorage.getItem(RELATIONSHIPS_KEY);
    return raw ? JSON.parse(raw) : { following: [], connections: [], incomingRequests: [], outgoingRequests: [] };
  } catch {
    return { following: [], connections: [], incomingRequests: [], outgoingRequests: [] };
  }
};

const writeRelationships = (rel: Relationships) => {
  window.localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(rel));
};

/* ─── Exports ───────────────────────────────────────────────────────────── */

export const getSession = () => readSession();

export const getKnownUsers = () => MOCK_USERS;

export const getConnectionCount = (userId: string) => {
  const rel = readRelationships();
  return (MOCK_USERS.find(u => u.id === userId)?.connectionsCount || 0) + (rel.connections.includes(userId) ? 1 : 0);
};

export const getFollowerCount = (userId: string) => {
  return (MOCK_USERS.find(u => u.id === userId)?.connectionsCount || 0) * 2;
};

export const getRelationshipState = (targetId: string) => {
  const rel = readRelationships();
  let connection: "none" | "requested" | "incoming-request" | "connected" = "none";
  if (rel.connections.includes(targetId)) connection = "connected";
  else if (rel.outgoingRequests.includes(targetId)) connection = "requested";
  else if (rel.incomingRequests.includes(targetId)) connection = "incoming-request";

  return {
    isFollowing: rel.following.includes(targetId),
    connection
  };
};

export const toggleFollowUser = (targetId: string): boolean => {
  const rel = readRelationships();
  const index = rel.following.indexOf(targetId);
  if (index > -1) {
    rel.following.splice(index, 1);
  } else {
    rel.following.push(targetId);
  }
  writeRelationships(rel);
  return index === -1;
};

export const requestConnection = (targetId: string): "requested" | "connected" => {
  const rel = readRelationships();
  if (rel.connections.includes(targetId)) return "connected";
  if (!rel.outgoingRequests.includes(targetId)) {
    rel.outgoingRequests.push(targetId);
    writeRelationships(rel);
  }
  return "requested";
};

export const respondConnectionRequest = (targetId: string, accept: boolean): "connected" | "none" => {
  const rel = readRelationships();
  rel.incomingRequests = rel.incomingRequests.filter(id => id !== targetId);
  if (accept) {
    rel.connections.push(targetId);
  }
  writeRelationships(rel);
  return accept ? "connected" : "none";
};

export const refreshAuthSession = async (): Promise<AuthSession | null> => {
  const current = readSession();
  if (!current) return null;
  if (current.token.startsWith("local-")) return current;
  if (!current.refreshToken) return current;

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
  if (current.token.startsWith("local-")) return current;
  return refreshAuthSession();
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = readSession()?.token;
  if (!token || token.startsWith("local-")) return {};
  return { Authorization: `Bearer ${token}` };
};

export const signIn = async (input: SignInInput): Promise<AuthSession> => {
  try {
    const session = await postJson<AuthSession>("/api/auth/signin", {
      email: normalizeEmail(input.email),
      password: input.password,
    });
    writeSession(session);
    notifyAuthUpdate(session);
    return session;
  } catch (error) {
    if (ENABLE_LOCAL_AUTH_FALLBACK) {
      const mockUser = MOCK_USERS.find(u => normalizeEmail(u.email) === normalizeEmail(input.email)) || MOCK_USERS[0];
      const session = createLocalSession(mockUser);
      writeSession(session);
      notifyAuthUpdate(session);
      return session;
    }
    throw error;
  }
};

export const signUp = async (input: SignUpInput): Promise<AuthSession> => {
  try {
    const session = await postJson<AuthSession>("/api/auth/signup", {
      ...input,
      email: normalizeEmail(input.email),
    });
    writeSession(session);
    notifyAuthUpdate(session);
    return session;
  } catch (error) {
    if (ENABLE_LOCAL_AUTH_FALLBACK) {
      const newUser: User = {
        id: `u-${Math.random().toString(36).slice(2)}`,
        name: input.name,
        email: normalizeEmail(input.email),
        rank: input.rank,
        district: input.district,
        innovationsCount: 0,
        connectionsCount: 0
      };
      const session = createLocalSession(newUser);
      writeSession(session);
      notifyAuthUpdate(session);
      return session;
    }
    throw error;
  }
};

export const signOut = () => {
  const session = readSession();
  if (session?.refreshToken && !session.token.startsWith("local-")) {
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
