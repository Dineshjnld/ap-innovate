import { CATEGORIES, DISTRICTS, RANKS, type User } from "@/data/mockData";

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

interface StoredUser extends AuthUser {
  password: string;
}

interface ConnectionEdge {
  key: string;
  status: "requested" | "connected";
  requestedBy: string;
}

const USERS_KEY = "apih_auth_users";
const SESSION_KEY = "apih_auth_session";
const AUTH_CHANNEL = "apih_auth_channel";
const FOLLOWS_KEY = "apih_follows";
const CONNECTIONS_KEY = "apih_connections";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const ENABLE_LOCAL_AUTH_FALLBACK = import.meta.env.VITE_ENABLE_LOCAL_AUTH_FALLBACK === "true";
const SESSION_REFRESH_SKEW_MS = 30 * 1000;

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

const validSet = <T extends string>(allowed: readonly T[], values: string[]) => {
  const map = new Set(allowed);
  return values.filter((value): value is T => map.has(value as T));
};

const readUsers = (): StoredUser[] => {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
};

const writeUsers = (users: StoredUser[]) => {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const readFollows = (): Record<string, string[]> => {
  try {
    const raw = window.localStorage.getItem(FOLLOWS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeFollows = (value: Record<string, string[]>) => {
  window.localStorage.setItem(FOLLOWS_KEY, JSON.stringify(value));
};

const readConnections = (): ConnectionEdge[] => {
  try {
    const raw = window.localStorage.getItem(CONNECTIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ConnectionEdge[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeConnections = (value: ConnectionEdge[]) => {
  window.localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(value));
};

const getPairKey = (a: string, b: string) => [a, b].sort().join("::");

const readSession = (): AuthSession | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

const writeSession = (session: AuthSession | null) => {
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const notifyAuthUpdate = (session: AuthSession | null) => {
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: "auth-changed", session });
    channel.close();
  } catch {
    return;
  }
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const createLocalSession = (user: AuthUser): AuthSession => ({
  token: `local-${Math.random().toString(36).slice(2, 12)}`,
  refreshToken: `local-r-${Math.random().toString(36).slice(2, 14)}`,
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  user,
});

const localSignIn = (input: SignInInput): AuthSession => {
  const email = normalizeEmail(input.email);
  const users = readUsers();
  const found = users.find((user) => normalizeEmail(user.email) === email);

  if (!found || found.password !== input.password) {
    throw new Error("Invalid credentials");
  }

  const { password: _password, ...safeUser } = found;
  const session = createLocalSession(safeUser);
  writeSession(session);
  notifyAuthUpdate(session);
  return session;
};

const localSignUp = (input: SignUpInput): AuthSession => {
  const email = normalizeEmail(input.email);
  const users = readUsers();

  if (users.some((user) => normalizeEmail(user.email) === email)) {
    throw new Error("An account with this email already exists");
  }

  const newUser: StoredUser = {
    id: `u-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name.trim(),
    email,
    password: input.password,
    rank: input.rank,
    district: input.district,
    interests: validSet(CATEGORIES, input.categories ?? []),
    bio: "",
    innovationsCount: 0,
    connectionsCount: 0,
  };

  writeUsers([...users, newUser]);

  const { password: _password, ...safeUser } = newUser;
  const session = createLocalSession(safeUser);
  writeSession(session);
  notifyAuthUpdate(session);
  return session;
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(new URL(path, API_BASE_URL).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthRequestError("Auth server is unreachable", "network");
  }

  if (!response.ok) {
    let message = "Authentication request failed";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new AuthRequestError(message, "http", response.status);
  }

  return (await response.json()) as T;
};

const shouldRefresh = (session: AuthSession | null) => {
  if (!session?.expiresAt) {
    return false;
  }

  return session.expiresAt - Date.now() <= SESSION_REFRESH_SKEW_MS;
};

let refreshPromise: Promise<AuthSession | null> | null = null;

const saveSession = (session: AuthSession) => {
  writeSession(session);
  notifyAuthUpdate(session);
};

export const getSession = () => readSession();

export const refreshAuthSession = async (): Promise<AuthSession | null> => {
  const current = readSession();
  if (!current?.refreshToken) {
    return current;
  }

  if (!shouldRefresh(current)) {
    return current;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshed = await postJson<AuthSession>("/api/auth/refresh", {
        refreshToken: current.refreshToken,
      });
      saveSession(refreshed);
      return refreshed;
    } catch {
      writeSession(null);
      notifyAuthUpdate(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const hydrateAuthSession = async (): Promise<AuthSession | null> => {
  const current = readSession();
  if (!current) {
    return null;
  }

  if (current.token.startsWith("local-")) {
    if (!ENABLE_LOCAL_AUTH_FALLBACK) {
      writeSession(null);
      notifyAuthUpdate(null);
      return null;
    }

    return current;
  }

  return refreshAuthSession();
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = readSession()?.token;
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const getKnownUsers = (): AuthUser[] => {
  const fromStorage = readUsers().map(({ password: _password, ...safeUser }) => safeUser);
  const fromSession = readSession()?.user;

  const map = new Map<string, AuthUser>();
  fromStorage.forEach((user) => {
    map.set(user.id, user);
  });

  if (fromSession) {
    map.set(fromSession.id, fromSession);
  }

  return Array.from(map.values());
};

export const getKnownUserById = (userId: string): AuthUser | null => {
  return getKnownUsers().find((user) => user.id === userId) ?? null;
};

export const getFollowerCount = (userId: string): number => {
  const follows = readFollows();
  return Object.values(follows).filter((targets) => targets.includes(userId)).length;
};

export const getConnectionCount = (userId: string): number => {
  return readConnections().filter((edge) => edge.status === "connected" && edge.key.split("::").includes(userId)).length;
};

export const getRelationshipState = (targetUserId: string) => {
  const currentUserId = readSession()?.user.id;
  if (!currentUserId || currentUserId === targetUserId) {
    return {
      isFollowing: false,
      connection: "none" as "none" | "requested" | "incoming-request" | "connected",
    };
  }

  const follows = readFollows();
  const isFollowing = (follows[currentUserId] ?? []).includes(targetUserId);

  const edge = readConnections().find((item) => item.key === getPairKey(currentUserId, targetUserId));
  if (!edge) {
    return { isFollowing, connection: "none" as const };
  }

  if (edge.status === "connected") {
    return { isFollowing, connection: "connected" as const };
  }

  return {
    isFollowing,
    connection: edge.requestedBy === currentUserId ? "requested" as const : "incoming-request" as const,
  };
};

export const toggleFollowUser = (targetUserId: string): boolean => {
  const currentUserId = readSession()?.user.id;
  if (!currentUserId || currentUserId === targetUserId) {
    return false;
  }

  const follows = readFollows();
  const current = follows[currentUserId] ?? [];
  const exists = current.includes(targetUserId);
  const next = exists ? current.filter((id) => id !== targetUserId) : [...current, targetUserId];

  follows[currentUserId] = next;
  writeFollows(follows);
  return !exists;
};

export const requestConnection = (targetUserId: string) => {
  const currentUserId = readSession()?.user.id;
  if (!currentUserId || currentUserId === targetUserId) {
    return "none" as const;
  }

  const key = getPairKey(currentUserId, targetUserId);
  const edges = readConnections();
  const index = edges.findIndex((edge) => edge.key === key);

  if (index < 0) {
    edges.push({ key, status: "requested", requestedBy: currentUserId });
    writeConnections(edges);
    return "requested" as const;
  }

  const existing = edges[index];
  if (existing.status === "connected") {
    return "connected" as const;
  }

  if (existing.requestedBy !== currentUserId) {
    edges[index] = { key, status: "connected", requestedBy: currentUserId };
    writeConnections(edges);
    return "connected" as const;
  }

  return "requested" as const;
};

export const respondConnectionRequest = (targetUserId: string, accept: boolean) => {
  const currentUserId = readSession()?.user.id;
  if (!currentUserId || currentUserId === targetUserId) {
    return "none" as const;
  }

  const key = getPairKey(currentUserId, targetUserId);
  const edges = readConnections();
  const index = edges.findIndex((edge) => edge.key === key);
  if (index < 0) {
    return "none" as const;
  }

  if (accept) {
    edges[index] = { key, status: "connected", requestedBy: currentUserId };
  } else {
    edges.splice(index, 1);
  }

  writeConnections(edges);
  return accept ? ("connected" as const) : ("none" as const);
};

export const signOut = () => {
  const refreshToken = readSession()?.refreshToken;
  if (refreshToken) {
    void postJson<{ ok: boolean }>("/api/auth/signout", {
      refreshToken,
    }).catch(() => {
      return;
    });
  }

  writeSession(null);
  notifyAuthUpdate(null);
};

export const updateSessionUser = (updates: Partial<AuthUser>): AuthSession | null => {
  const current = readSession();
  if (!current) {
    return null;
  }

  const nextSession: AuthSession = {
    ...current,
    user: {
      ...current.user,
      ...updates,
    },
  };

  writeSession(nextSession);

  const users = readUsers();
  const userIndex = users.findIndex((item) => item.id === current.user.id);
  if (userIndex >= 0) {
    users[userIndex] = {
      ...users[userIndex],
      ...nextSession.user,
    };
    writeUsers(users);
  }

  notifyAuthUpdate(nextSession);
  return nextSession;
};

export const signIn = async (input: SignInInput): Promise<AuthSession> => {
  const email = normalizeEmail(input.email);

  if (!email || !input.password) {
    throw new Error("Email and password are required");
  }

  try {
    const apiSession = await postJson<AuthSession>("/api/auth/signin", {
      email,
      password: input.password,
    });
    saveSession(apiSession);
    return apiSession;
  } catch (error) {
    if (error instanceof AuthRequestError) {
      if (error.reason === "network" || error.status === 404 || (error.status ?? 0) >= 500) {
        if (!ENABLE_LOCAL_AUTH_FALLBACK) {
          throw new Error("Auth server is unavailable. Please try again once backend service is reachable.");
        }

        return localSignIn({
          email,
          password: input.password,
        });
      }

      throw new Error(error.message || "Invalid credentials");
    }

    throw new Error("Invalid credentials");
  }
};

export const signUp = async (input: SignUpInput): Promise<AuthSession> => {
  const email = normalizeEmail(input.email);

  if (!input.name.trim() || !email || !input.password.trim()) {
    throw new Error("Name, email, and password are required");
  }

  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const district = validSet(DISTRICTS, [input.district])[0];
  if (!district) {
    throw new Error("Select a valid district");
  }

  const rank = validSet(RANKS, [input.rank])[0];
  if (!rank) {
    throw new Error("Select a valid rank");
  }

  const interests = validSet(CATEGORIES, input.categories ?? []);

  try {
    const apiSession = await postJson<AuthSession>("/api/auth/signup", {
      ...input,
      email,
      district,
      rank,
      categories: interests,
    });
    saveSession(apiSession);
    return apiSession;
  } catch (error) {
    if (error instanceof AuthRequestError) {
      const backendUnavailable = error.reason === "network" || error.status === 404 || (error.status ?? 0) >= 500;
      if (!backendUnavailable) {
        throw new Error(error.message || "Unable to sign up");
      }

      if (!ENABLE_LOCAL_AUTH_FALLBACK) {
        throw new Error("Auth server is unavailable. Please try again once backend service is reachable.");
      }

      return localSignUp({
        ...input,
        email,
        district,
        rank,
        categories: interests,
      });
    }

    throw new Error("Unable to sign up");
  }
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
    channel.onmessage = () => {
      onSession(readSession());
    };
  } catch {
    channel = null;
  }

  onSession(readSession());

  return () => {
    window.removeEventListener("storage", onStorage);
    if (channel) {
      channel.close();
    }
  };
};
