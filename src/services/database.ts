import type {
  DiscussionComment,
  FeedItem,
  Project,
  User,
} from "@/data/mockData";
import { MOCK_FEED, MOCK_PROJECTS } from "@/data/mockData";
import { getAuthHeaders, getKnownUserById, getSession, refreshAuthSession } from "@/services/auth";

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
const LOCAL_MESSAGES_KEY = "apih_local_messages";
const LOCAL_NOTIFICATIONS_KEY = "apih_local_notifications";
const LOCAL_PROJECTS_KEY = "apih_local_projects";
const LOCAL_FEED_KEY = "apih_local_feed";

export interface CreateProjectInput {
  title: string;
  category: string[];
  district: string;
  problemStatement: string;
  proposedSolution: string;
  budget: number;
  externalLinks: string[];
}

const buildUrl = (path: string, query?: Record<string, string>) => {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value.trim().length > 0) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

async function getJson<T>(path: string, query?: Record<string, string>): Promise<T> {
  const doRequest = () =>
    fetch(buildUrl(path, query), {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

  let response = await doRequest();
  if (response.status === 401 && getSession()?.refreshToken) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      response = await doRequest();
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const doRequest = () =>
    fetch(buildUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });

  let response = await doRequest();
  if (response.status === 401 && getSession()?.refreshToken) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      response = await doRequest();
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const doRequest = () =>
    fetch(buildUrl(path), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });

  let response = await doRequest();
  if (response.status === 401 && getSession()?.refreshToken) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      response = await doRequest();
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

const safeRun = async <T>(task: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await task();
  } catch {
    return fallback;
  }
};

const makePollSubscription = <T>(
  poller: () => Promise<T>,
  onData: (data: T) => void,
  intervalMs = POLL_INTERVAL_MS,
): Unsubscribe => {
  let active = true;

  const tick = async () => {
    const data = await poller();
    if (active) {
      onData(data);
    }
  };

  void tick();
  const timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    active = false;
    window.clearInterval(timer);
  };
};

const readLocalMessages = (): MessageItem[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as MessageItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalMessages = (messages: MessageItem[]) => {
  window.localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
};

const readLocalNotifications = (): NotificationItem[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalNotifications = (notifications: NotificationItem[]) => {
  window.localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

const readLocalProjects = (): Project[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalProjects = (projects: Project[]) => {
  window.localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
};

const readLocalFeed = (): FeedItem[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_FEED_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as FeedItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalFeed = (feed: FeedItem[]) => {
  window.localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(feed));
};

const mergeById = <T extends { id: string }>(items: T[]) => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    map.set(item.id, item);
  });
  return Array.from(map.values());
};

const getFallbackProjects = () => mergeById([...MOCK_PROJECTS, ...readLocalProjects()]);

const getFallbackFeed = () => mergeById([...readLocalFeed(), ...MOCK_FEED]);

const normalize = (value: string) => value.trim().toLowerCase();

const filterMockProjects = (query?: ProjectFilterQuery): Project[] => {
  const source = getFallbackProjects();

  if (!query) {
    return source;
  }

  const categories = query.categories.map(normalize).filter((item) => item.length > 0);
  const districts = query.districts.map(normalize).filter((item) => item.length > 0);
  const search = normalize(query.search ?? "");

  return source.filter((project) => {
    const projectCategories = project.category.map(normalize);
    const projectDistrict = normalize(project.district);
    const haystack = [
      project.title,
      project.problemStatement,
      project.proposedSolution,
      project.author.name,
      project.author.rank,
      project.author.district,
      ...project.category,
      project.district,
    ]
      .join(" ")
      .toLowerCase();

    const categoryMatch = categories.length === 0 || categories.some((category) => projectCategories.includes(category));
    const districtMatch = districts.length === 0 || districts.includes(projectDistrict);
    const searchMatch = search.length === 0 || haystack.includes(search);

    return categoryMatch && districtMatch && searchMatch;
  });
};

export const seedDatabaseIfEmpty = async () => {
  return;
};

export const fetchProjectById = async (projectId: string) =>
  safeRun(
    () => getJson<Project>(`/api/projects/${projectId}`),
    getFallbackProjects().find((project) => project.id === projectId) ?? null,
  );

export const fetchDiscoverUsers = async (search = "") =>
  safeRun(
    () =>
      getJson<User[]>("/api/users", {
        q: search,
      }),
    [],
  );

export const fetchUserById = async (userId: string) =>
  safeRun(() => getJson<User>(`/api/users/${userId}`), null);

export const subscribeDiscoverUsers = (onData: (users: User[]) => void, search = ""): Unsubscribe =>
  makePollSubscription(() => fetchDiscoverUsers(search), onData, 7000);

export const subscribeProjects = (
  query: ProjectFilterQuery,
  onData: (projects: Project[]) => void,
): Unsubscribe =>
  makePollSubscription(
    () =>
      safeRun(
        () =>
          getJson<Project[]>("/api/projects", {
            categories: query.categories.join(","),
            districts: query.districts.join(","),
            q: query.search ?? "",
          }),
        filterMockProjects(query),
      ),
    onData,
  );

export const subscribeAllProjects = (onData: (projects: Project[]) => void): Unsubscribe =>
  makePollSubscription(
    () => safeRun(() => getJson<Project[]>("/api/projects"), getFallbackProjects()),
    onData,
  );

export const subscribeProjectById = (
  projectId: string,
  onData: (project: Project | null) => void,
): Unsubscribe =>
  makePollSubscription(() => fetchProjectById(projectId), onData);

export const subscribeActivityFeed = (onData: (items: FeedItem[]) => void): Unsubscribe =>
  makePollSubscription(
    () => safeRun(() => getJson<FeedItem[]>("/api/activities"), getFallbackFeed()),
    onData,
  );

export const createProject = async (input: CreateProjectInput): Promise<Project | null> => {
  const session = getSession();
  const currentUser = session?.user;
  if (!currentUser) {
    return null;
  }

  const title = input.title.trim();
  if (!title) {
    return null;
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const now = Date.now();
  const isoDate = new Date(now).toISOString().slice(0, 10);

  const localProject: Project = {
    id: `p-${Math.random().toString(36).slice(2, 10)}`,
    title,
    slug,
    category: input.category,
    district: input.district,
    author: currentUser,
    problemStatement: input.problemStatement.trim(),
    proposedSolution: input.proposedSolution.trim(),
    budget: Math.max(0, Number.isFinite(input.budget) ? input.budget : 0),
    status: "submitted",
    createdAt: isoDate,
    updatedAt: isoDate,
    attachments: [],
    externalLinks: input.externalLinks,
    commentsCount: 0,
    versions: 1,
  };

  const remote = await safeRun(
    () =>
      postJson<Project>("/api/projects", {
        title: localProject.title,
        category: localProject.category,
        district: localProject.district,
        problemStatement: localProject.problemStatement,
        proposedSolution: localProject.proposedSolution,
        budget: localProject.budget,
        externalLinks: localProject.externalLinks,
      }),
    null,
  );

  const project = remote ?? localProject;

  if (!remote) {
    const existingProjects = readLocalProjects().filter((item) => item.id !== project.id);
    writeLocalProjects([project, ...existingProjects]);
  }

  const timestamp = new Date(now).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const feedItem: FeedItem = {
    id: `f-${Math.random().toString(36).slice(2, 10)}`,
    user: currentUser,
    action: "posted a new innovation",
    projectTitle: project.title,
    projectId: project.id,
    timestamp: `${timestamp}`,
  };

  if (!remote) {
    writeLocalFeed([feedItem, ...readLocalFeed()].slice(0, 40));
  }

  return project;
};

export const subscribeProjectComments = (
  projectId: string,
  onData: (items: DiscussionComment[]) => void,
): Unsubscribe =>
  makePollSubscription(
    () =>
      safeRun(
        () => getJson<DiscussionComment[]>(`/api/projects/${projectId}/comments`),
        [],
      ),
    onData,
    3000,
  );

export const createComment = async (input: {
  projectId: string;
  content: string;
  parentId: string | null;
}) =>
  safeRun(
    () =>
      postJson<DiscussionComment>(`/api/projects/${input.projectId}/comments`, {
        content: input.content,
        parentId: input.parentId,
      }),
    null,
  );

export const subscribeCurrentUserProfile = (onData: (user: User | null) => void): Unsubscribe =>
  makePollSubscription(
    () => safeRun(() => getJson<User>("/api/users/me"), null),
    onData,
    8000,
  );

export const updateCurrentUserProfile = async (input: {
  name: string;
  district: string;
  bio: string;
}) =>
  safeRun(
    () =>
      putJson<User>("/api/users/me", {
        name: input.name,
        district: input.district,
        bio: input.bio,
      }),
    null,
  );

export const subscribeCurrentUserMessages = (
  onData: (messages: MessageItem[]) => void,
): Unsubscribe =>
  makePollSubscription(
    async () => {
      const remote = await safeRun(() => getJson<MessageItem[]>("/api/messages/me"), []);
      if (remote.length > 0) {
        return remote;
      }

      const userId = getSession()?.user.id;
      if (!userId) {
        return [];
      }

      const local = readLocalMessages();
      return local
        .filter((message) => message.to === userId || message.from === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    onData,
    4000,
  );

export const sendCurrentUserMessage = async (input: { to: string; text: string }) => {
  const text = input.text.trim();
  const to = input.to.trim();
  if (!text) {
    return null;
  }

  const from = getSession()?.user.id;
  if (!from || !to || from === to) {
    return null;
  }

  const remote = await safeRun(
    () =>
      postJson<MessageItem>("/api/messages/me", {
        to,
        text,
      }),
    null,
  );

  if (remote) {
    return remote;
  }

  const item: MessageItem = {
    id: `m-${Math.random().toString(36).slice(2, 10)}`,
    from,
    to,
    text,
    createdAt: Date.now(),
    read: false,
  };

  const all = readLocalMessages();
  all.push(item);
  writeLocalMessages(all);

  const notifications = readLocalNotifications();
  const senderName = getKnownUserById(from)?.name ?? from;
  notifications.push({
    id: `n-${Math.random().toString(36).slice(2, 10)}`,
    title: "New message",
    body: `You received a new message from ${senderName}`,
    createdAt: Date.now(),
    read: false,
  });
  writeLocalNotifications(notifications);

  return item;
};

export const markConversationMessagesAsRead = async (peerId: string) => {
  const userId = getSession()?.user.id;
  if (!userId) {
    return;
  }

  await safeRun(
    () =>
      postJson<{ ok: boolean }>("/api/messages/me/read", {
        peerId,
      }),
    { ok: false },
  );

  const local = readLocalMessages();
  const updated = local.map((item) => {
    if (item.to === userId && item.from === peerId && !item.read) {
      return {
        ...item,
        read: true,
      };
    }
    return item;
  });
  writeLocalMessages(updated);
};

export const subscribeCurrentUserNotifications = (
  onData: (notifications: NotificationItem[]) => void,
): Unsubscribe =>
  makePollSubscription(
    async () => {
      const remote = await safeRun(() => getJson<NotificationItem[]>("/api/notifications/me"), []);
      if (remote.length > 0) {
        return remote;
      }

      return readLocalNotifications().sort((a, b) => b.createdAt - a.createdAt);
    },
    onData,
    4000,
  );

export const markAllNotificationsAsRead = async () => {
  await safeRun(
    () => postJson<{ ok: boolean }>("/api/notifications/me/read", {}),
    { ok: false },
  );

  const updated = readLocalNotifications().map((item) => ({
    ...item,
    read: true,
  }));
  writeLocalNotifications(updated);
};
