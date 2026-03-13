import { type AuthUser, type AuthSession, type SignInInput, type SignUpInput } from "@/services/auth";
import { 
  MOCK_PROJECTS, 
  MOCK_USERS, 
  MOCK_FEED, 
  MOCK_DISCUSSION_COMMENTS, 
  type Project, 
  type User, 
  type FeedItem,
  type DiscussionComment 
} from "@/data/mockData";
import { getAuthHeaders, getSession, refreshAuthSession } from "@/services/auth";

/* ─── Types & Config ─────────────────────────────────────────────────────── */

export interface ProjectFilterQuery {
  categories: string[];
  districts: string[];
  search?: string;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_REALTIME_POLL_MS ?? "4000");
const ENABLE_FALLBACK = import.meta.env.VITE_ENABLE_LOCAL_AUTH_FALLBACK === "true";
const ENABLE_API = import.meta.env.VITE_ENABLE_API !== "false";

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
  if (!ENABLE_API && ENABLE_FALLBACK) {
    return new Response(null, { status: 503 });
  }

  const doRequest = () =>
    fetch(buildUrl(path, query), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

  try {
    let response = await doRequest();
    
    if (response.status === 401 && getSession()?.refreshToken) {
      const refreshed = await refreshAuthSession();
      if (refreshed) response = await doRequest();
    }

    if (!response.ok && !ENABLE_FALLBACK) {
      throw new Error(`API error: ${response.status}`);
    }

    return response;
  } catch (err) {
    if (ENABLE_FALLBACK) {
      // Return a fake 503 response so the JSON parsers can catch it and fallback
      return new Response(null, { status: 503 });
    }
    throw err;
  }
}

async function getJson<T>(path: string, fallback: T, query?: Record<string, string>): Promise<T> {
  try {
    const response = await fetchWithAuth(path, { method: "GET" }, query);
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
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

/* ─── API Methods with Mock Fallbacks ──────────────────────────────────── */

export const seedDatabaseIfEmpty = async () => {};

export const fetchProjectById = async (projectId: string) =>
  getJson<Project | null>(`/api/projects/${projectId}`, MOCK_PROJECTS.find(p => p.id === projectId) || null);

export const subscribeProjectById = (
  projectId: string,
  onData: (project: Project | null) => void,
): Unsubscribe =>
  makePollSubscription(() => fetchProjectById(projectId), onData, 3000);

export const fetchDiscoverUsers = async (search = "") =>
  getJson<User[]>("/api/users", MOCK_USERS, { q: search });

export const fetchUserById = async (userId: string) =>
  getJson<User | null>(`/api/users/${userId}`, MOCK_USERS.find(u => u.id === userId) || null);

export const subscribeDiscoverUsers = (onData: (users: User[]) => void, search = ""): Unsubscribe =>
  makePollSubscription(() => fetchDiscoverUsers(search), onData, 7000);

export const subscribeProjects = (
  query: ProjectFilterQuery,
  onData: (projects: Project[]) => void,
): Unsubscribe =>
  makePollSubscription(
    async () => {
      try {
        const response = await fetchWithAuth("/api/projects", { method: "GET" }, {
          categories: query.categories.join(","),
          districts: query.districts.join(","),
          q: query.search ?? "",
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.warn("API request failed, falling back to filtered mock data", err);
      }

      // Fallback: Filter mock data locally
      return MOCK_PROJECTS.filter((p) => {
        const categoryMatch =
          query.categories.length === 0 ||
          p.category.some((cat) => query.categories.includes(cat));
        
        const districtMatch =
          query.districts.length === 0 ||
          query.districts.includes(p.district);
        
        const searchMatch =
          !query.search ||
          p.title.toLowerCase().includes(query.search.toLowerCase()) ||
          p.problemStatement.toLowerCase().includes(query.search.toLowerCase());

        return categoryMatch && districtMatch && searchMatch;
      });
    },
    onData,
  );

export const subscribeAllProjects = (onData: (projects: Project[]) => void): Unsubscribe =>
  makePollSubscription(() => getJson<Project[]>("/api/projects", MOCK_PROJECTS), onData);

export const subscribeActivityFeed = (onData: (items: FeedItem[]) => void): Unsubscribe =>
  makePollSubscription(() => getJson<FeedItem[]>("/api/activities", MOCK_FEED), onData);

export const createProject = async (input: any): Promise<Project> => {
  try {
    const response = await fetchWithAuth("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return await response.json();
  } catch {
    // If offline, simulate success for UX
    return { ...MOCK_PROJECTS[0], id: `p-${Date.now()}`, ...input };
  }
};

export const subscribeProjectComments = (
  projectId: string,
  onData: (items: DiscussionComment[]) => void,
): Unsubscribe =>
  makePollSubscription(
    () => getJson<DiscussionComment[]>(`/api/projects/${projectId}/comments`, MOCK_DISCUSSION_COMMENTS.filter(c => c.projectId === projectId)),
    onData,
    3000,
  );

export const createComment = async (input: any) => {
  try {
    return await (await fetchWithAuth(`/api/projects/${input.projectId}/comments`, {
      method: "POST",
      body: JSON.stringify(input),
    })).json();
  } catch {
    return MOCK_DISCUSSION_COMMENTS[0];
  }
};

export const subscribeCurrentUserProfile = (onData: (user: User | null) => void): Unsubscribe =>
  makePollSubscription(
    () => getJson<User | null>("/api/users/me", MOCK_USERS[0]),
    onData,
    8000,
  );

export const updateCurrentUserProfile = async (input: any) =>
  (await fetchWithAuth("/api/users/me", { method: "PUT", body: JSON.stringify(input) })).json();

export const subscribeCurrentUserMessages = (onData: (messages: MessageItem[]) => void): Unsubscribe =>
  makePollSubscription(() => getJson<MessageItem[]>("/api/messages/me", []), onData, 4000);

export const sendCurrentUserMessage = async (input: any) =>
  (await fetchWithAuth("/api/messages/me", { method: "POST", body: JSON.stringify(input) })).json();

export const markConversationMessagesAsRead = async (peerId: string) => {
  await fetchWithAuth("/api/messages/me/read", { method: "POST", body: JSON.stringify({ peerId }) });
};

export const subscribeCurrentUserNotifications = (onData: (notifications: NotificationItem[]) => void): Unsubscribe =>
  makePollSubscription(() => getJson<NotificationItem[]>("/api/notifications/me", []), onData, 4000);

export const markAllNotificationsAsRead = async () => {
  await fetchWithAuth("/api/notifications/me/read", { method: "POST" });
};

export const clearAllNotifications = async () => {
  await fetchWithAuth("/api/notifications/me", { method: "DELETE" });
};

export const deleteNotificationById = async (id: string) => {
  await fetchWithAuth(`/api/notifications/me/${id}`, { method: "DELETE" });
};

export const updateProjectStatus = async (projectId: string, input: any) => {
  try {
    return await (await fetchWithAuth(`/api/projects/${projectId}/status`, {
      method: "PUT",
      body: JSON.stringify(input),
    })).json();
  } catch {
    return MOCK_PROJECTS[0];
  }
};
