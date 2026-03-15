import {
  type Project,
  type User,
  type FeedItem,
  type DiscussionComment,
} from "@/data/mockData";
import { getAuthHeaders, getSession, refreshAuthSession } from "@/services/auth";

/* ─── Types & Config ─────────────────────────────────────────────────────── */

export interface ProjectFilterQuery {
  categories: string[];
  districts: string[];
  search?: string;
}

export interface CreateProjectInput {
  title: string;
  category: string[];
  district: string;
  problemStatement: string;
  proposedSolution: string;
  budget?: number;
  externalLinks?: string[];
  attachments?: string[];
}

export interface MessageItem {
  id: string;
  from: string;
  to: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

type Unsubscribe = () => void;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_REALTIME_POLL_MS ?? "4000");

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const buildUrl = (path: string, query?: Record<string, string>) => {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value && value.trim().length > 0) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

async function fetchWithAuth(path: string, options: RequestInit = {}, query?: Record<string, string>): Promise<Response> {
  const doRequest = () =>
    fetch(buildUrl(path, query), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

  let response = await doRequest();

  if (response.status === 401 && getSession()?.refreshToken) {
    const refreshed = await refreshAuthSession();
    if (refreshed) response = await doRequest();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(body.message ?? `API error: ${response.status}`);
  }

  return response;
}

async function getJson<T>(path: string, query?: Record<string, string>): Promise<T> {
  const response = await fetchWithAuth(path, { method: "GET" }, query);
  return response.json();
}

const makePollSubscription = <T>(
  poller: () => Promise<T>,
  onData: (data: T) => void,
  intervalMs = POLL_INTERVAL_MS,
): Unsubscribe => {
  let active = true;
  const tick = async () => {
    try {
      const data = await poller();
      if (active) onData(data);
    } catch (e) {
      console.error("Polling error:", e);
    }
  };
  void tick();
  const timer = window.setInterval(tick, intervalMs);
  return () => { active = false; window.clearInterval(timer); };
};

/* ─── Upload helper ──────────────────────────────────────────────────────── */

export const uploadFiles = async (files: File[]): Promise<{ url: string; originalName: string; size: number }[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(buildUrl("/api/upload"), {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(body.message ?? "Upload failed");
  }

  const data = await response.json();
  return data.files.map((f: { url: string; originalName: string; size: number }) => ({
    url: f.url,
    originalName: f.originalName,
    size: f.size,
  }));
};

export const uploadAvatar = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch(buildUrl("/api/users/me/avatar"), {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Avatar upload failed" }));
    throw new Error(body.message ?? "Avatar upload failed");
  }

  return response.json();
};

/* ─── API Methods ────────────────────────────────────────────────────────── */

export const fetchProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    return await getJson<Project>(`/api/projects/${projectId}`);
  } catch {
    return null;
  }
};

export const subscribeProjectById = (
  projectId: string,
  onData: (project: Project | null) => void,
): Unsubscribe =>
  makePollSubscription(() => fetchProjectById(projectId), onData, 3000);

export const fetchDiscoverUsers = async (search = ""): Promise<User[]> => {
  try {
    return await getJson<User[]>("/api/users", { q: search });
  } catch {
    return [];
  }
};

export const fetchUserById = async (userId: string): Promise<User | null> => {
  try {
    return await getJson<User>(`/api/users/${userId}`);
  } catch {
    return null;
  }
};

export const subscribeDiscoverUsers = (onData: (users: User[]) => void, search = ""): Unsubscribe =>
  makePollSubscription(() => fetchDiscoverUsers(search), onData, 7000);

export const subscribeProjects = (
  query: ProjectFilterQuery,
  onData: (projects: Project[]) => void,
): Unsubscribe =>
  makePollSubscription(
    async () => {
      const response = await fetchWithAuth("/api/projects", { method: "GET" }, {
        categories: query.categories.join(","),
        districts: query.districts.join(","),
        q: query.search ?? "",
      });
      return response.json();
    },
    onData,
  );

export const subscribeAllProjects = (onData: (projects: Project[]) => void): Unsubscribe =>
  makePollSubscription(() => getJson<Project[]>("/api/projects"), onData);

export const subscribeActivityFeed = (onData: (items: FeedItem[]) => void): Unsubscribe =>
  makePollSubscription(() => getJson<FeedItem[]>("/api/activities"), onData);

export const createProject = async (input: CreateProjectInput): Promise<Project> => {
  const response = await fetchWithAuth("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
};

export const subscribeProjectComments = (
  projectId: string,
  onData: (items: DiscussionComment[]) => void,
): Unsubscribe =>
  makePollSubscription(
    () => getJson<DiscussionComment[]>(`/api/projects/${projectId}/comments`),
    onData,
    3000,
  );

export const createComment = async (input: { projectId: string; content: string; parentId?: string }): Promise<DiscussionComment> => {
  const response = await fetchWithAuth(`/api/projects/${input.projectId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json();
};

export const subscribeCurrentUserProfile = (onData: (user: User | null) => void): Unsubscribe =>
  makePollSubscription(
    async () => {
      try { return await getJson<User>("/api/users/me"); } catch { return null; }
    },
    onData,
    8000,
  );

export const updateCurrentUserProfile = async (input: { name?: string; district?: string; bio?: string }): Promise<User> => {
  const response = await fetchWithAuth("/api/users/me", { method: "PUT", body: JSON.stringify(input) });
  return response.json();
};

export const subscribeCurrentUserMessages = (onData: (messages: MessageItem[]) => void): Unsubscribe =>
  makePollSubscription(async () => {
    try { return await getJson<MessageItem[]>("/api/messages/me"); } catch { return []; }
  }, onData, 4000);

export const sendCurrentUserMessage = async (input: { to: string; text: string }): Promise<MessageItem> => {
  const response = await fetchWithAuth("/api/messages/me", { method: "POST", body: JSON.stringify(input) });
  return response.json();
};

export const markConversationMessagesAsRead = async (peerId: string) => {
  await fetchWithAuth("/api/messages/me/read", { method: "POST", body: JSON.stringify({ peerId }) });
};

export const subscribeCurrentUserNotifications = (onData: (notifications: NotificationItem[]) => void): Unsubscribe =>
  makePollSubscription(async () => {
    try { return await getJson<NotificationItem[]>("/api/notifications/me"); } catch { return []; }
  }, onData, 4000);

export const markAllNotificationsAsRead = async () => {
  await fetchWithAuth("/api/notifications/me/read", { method: "POST" });
};

export const clearAllNotifications = async () => {
  await fetchWithAuth("/api/notifications/me", { method: "DELETE" });
};

export const deleteNotificationById = async (id: string) => {
  await fetchWithAuth(`/api/notifications/me/${id}`, { method: "DELETE" });
};

export const updateProjectStatus = async (projectId: string, input: { status: string; comment: string }): Promise<Project> => {
  const response = await fetchWithAuth(`/api/projects/${projectId}/status`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return response.json();
};

/* ─── Follow / Connection API helpers ────────────────────────────────────── */

export const toggleFollowUser = async (targetId: string): Promise<{ following: boolean }> => {
  const response = await fetchWithAuth(`/api/users/${targetId}/follow`, { method: "POST" });
  return response.json();
};

export const getFollowerInfo = async (targetId: string): Promise<{ count: number; isFollowing: boolean }> => {
  return getJson<{ count: number; isFollowing: boolean }>(`/api/users/${targetId}/followers`);
};

export const requestConnection = async (targetId: string): Promise<{ status: string }> => {
  const response = await fetchWithAuth(`/api/users/${targetId}/connect`, { method: "POST" });
  return response.json();
};

export const getConnectionStatus = async (targetId: string): Promise<{ status: string }> => {
  return getJson<{ status: string }>(`/api/users/${targetId}/connection`);
};

export const getConnectionsCount = async (targetId: string): Promise<{ count: number }> => {
  return getJson<{ count: number }>(`/api/users/${targetId}/connections-count`);
};

export const fetchStats = async (): Promise<{ totalProjects: number; totalUsers: number; totalComments: number }> => {
  return getJson("/api/stats");
};

/* ─── Project edit / user projects ────────────────────────────────────── */

export const fetchUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    return await getJson<Project[]>("/api/projects", { author: userId });
  } catch {
    return [];
  }
};

export const updateProject = async (projectId: string, input: Partial<CreateProjectInput>): Promise<Project> => {
  const response = await fetchWithAuth(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return response.json();
};

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  title: string;
  category: string[];
  district: string;
  problemStatement: string;
  proposedSolution: string;
  budget: number;
  attachments: string[];
  externalLinks: string[];
  editedBy: import("@/data/mockData").User | null;
  createdAt: string;
}

export const fetchProjectVersions = async (projectId: string): Promise<ProjectVersion[]> => {
  try {
    return await getJson<ProjectVersion[]>(`/api/projects/${projectId}/versions`);
  } catch {
    return [];
  }
};

/* ─── Admin API helpers ───────────────────────────────────────────────── */

export const adminFetchProjects = async (query?: { status?: string; author?: string; q?: string }): Promise<Project[]> => {
  const params: Record<string, string> = {};
  if (query?.status) params.status = query.status;
  if (query?.author) params.author = query.author;
  if (query?.q) params.q = query.q;
  return getJson<Project[]>("/api/admin/projects", params);
};

export const adminFetchUsers = async (): Promise<import("@/data/mockData").User[]> => {
  return getJson("/api/admin/users");
};

export const adminFetchStats = async (): Promise<{ totalProjects: number; totalUsers: number; totalComments: number; pendingReview: number }> => {
  return getJson("/api/admin/stats");
};

export const adminUpdateUserRole = async (userId: string, role: string): Promise<import("@/data/mockData").User> => {
  const response = await fetchWithAuth(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
  return response.json();
};
