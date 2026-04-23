import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  Search,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import type { User as UserType } from "@/data/mockData";
import type { MessageConversationSummary, MessageItem } from "@/services/database";
import {
  fetchConversationMessages,
  fetchCurrentUserConversations,
  fetchDiscoverUsers,
  fetchUserById,
  markConversationMessagesAsRead,
  sendCurrentUserMessage,
  subscribeCurrentUserConversations,
} from "@/services/realtime";
import { socketService, type PresenceInfo } from "@/services/socket";

const isSameDay = (a: number, b: number) =>
  new Date(a).toDateString() === new Date(b).toDateString();

const dateSeparatorLabel = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

const mergeChatItems = (items: MessageItem[]) => {
  const map = new Map<string, MessageItem>();

  for (const item of items) {
    const existing = map.get(item.id);
    map.set(
      item.id,
      existing
        ? {
            ...existing,
            ...item,
            read: existing.read || item.read,
          }
        : item,
    );
  }

  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
};

const MessagesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const [conversations, setConversations] = useState<MessageConversationSummary[]>([]);
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<UserType[]>([]);
  const [selectedPeerUser, setSelectedPeerUser] = useState<UserType | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get("to") ?? "");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [presence, setPresence] = useState<Map<string, PresenceInfo>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const prevSelectedUserRef = useRef("");
  const currentUserId = session?.user.id ?? "";

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.peerId === selectedUserId),
    [conversations, selectedUserId],
  );

  const selectedUser = selectedConversation?.peer ?? selectedPeerUser;

  const knownUsers = useMemo(() => {
    const users = new Map<string, UserType>();

    for (const conversation of conversations) {
      users.set(conversation.peerId, conversation.peer);
    }

    for (const user of discoverUsers) {
      if (user.id !== currentUserId) {
        users.set(user.id, user);
      }
    }

    return Array.from(users.values());
  }, [conversations, discoverUsers, currentUserId]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return knownUsers;
    const q = userSearchQuery.toLowerCase();
    return knownUsers.filter((user) =>
      [user.name, user.rank, user.district, user.email].join(" ").toLowerCase().includes(q),
    );
  }, [knownUsers, userSearchQuery]);

  const filteredConversations = useMemo(() => {
    if (!userSearchQuery.trim()) return conversations;
    const q = userSearchQuery.toLowerCase();
    return conversations.filter((conversation) =>
      [
        conversation.peer.name,
        conversation.peer.rank,
        conversation.peer.district,
        conversation.lastMessage.text,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [conversations, userSearchQuery]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [conversations],
  );

  const scrollToBottom = useCallback((instant?: boolean) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
  }, []);

  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  useEffect(() => {
    let active = true;

    void fetchCurrentUserConversations()
      .then((items) => {
        if (!active) return;
        setConversations(items);
        setIsLoadingConversations(false);
      })
      .catch(() => {
        if (!active) return;
        setIsLoadingConversations(false);
      });

    const stop = subscribeCurrentUserConversations((items) => {
      if (!active) return;
      setConversations(items);
    });

    return () => {
      active = false;
      stop();
    };
  }, []);

  useEffect(() => {
    if (!showNewChat) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      const users = await fetchDiscoverUsers(userSearchQuery.trim());
      if (!active) return;
      setDiscoverUsers(users.filter((user) => user.id !== currentUserId));
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [showNewChat, userSearchQuery, currentUserId]);

  useEffect(() => {
    return socketService.onPresenceChange((snapshot) => {
      setPresence(new Map(snapshot));
    });
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setChatMessages([]);
      setSelectedPeerUser(null);
      setIsLoadingMessages(false);
      return;
    }

    let active = true;
    setIsLoadingMessages(true);

    if (selectedConversation?.peer) {
      setSelectedPeerUser(selectedConversation.peer);
    }

    void fetchConversationMessages(selectedUserId, { limit: 140 })
      .then(async (result) => {
        if (!active) return;

        if (result) {
          setSelectedPeerUser(result.peer);
          setChatMessages(result.messages);
        } else {
          setChatMessages([]);
          const user = await fetchUserById(selectedUserId);
          if (active && user) {
            setSelectedPeerUser(user);
          }
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingMessages(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedUserId, selectedConversation?.peer]);

  useEffect(() => {
    if (selectedConversation?.peer) {
      setSelectedPeerUser(selectedConversation.peer);
    }
  }, [selectedConversation?.peer]);

  useEffect(() => {
    const socket = socketService.getSocket();

    const onTyping = (data: { from: string }) => {
      if (data.from) {
        setTypingUsers((prev) => new Set(prev).add(data.from));
      }
    };

    const onStopTyping = (data: { from: string }) => {
      if (!data.from) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.from);
        return next;
      });
    };

    const onMessageReceived = (message: MessageItem) => {
      if (!selectedUserId || !currentUserId) return;

      const belongsToOpenConversation =
        (message.from === currentUserId && message.to === selectedUserId) ||
        (message.from === selectedUserId && message.to === currentUserId);

      if (!belongsToOpenConversation) return;

      setChatMessages((prev) => mergeChatItems([...prev, message]));
    };

    const onMessagesRead = (payload: { userId?: string; peerId?: string }) => {
      if (!selectedUserId || !payload.userId || !payload.peerId) return;

      const belongsToOpenConversation =
        (payload.userId === currentUserId && payload.peerId === selectedUserId) ||
        (payload.userId === selectedUserId && payload.peerId === currentUserId);

      if (!belongsToOpenConversation) return;

      setChatMessages((prev) =>
        prev.map((item) => {
          const currentUserReadPeer =
            payload.userId === currentUserId &&
            item.to === currentUserId &&
            item.from === selectedUserId;

          const peerReadCurrentUser =
            payload.userId === selectedUserId &&
            item.to === selectedUserId &&
            item.from === currentUserId;

          return currentUserReadPeer || peerReadCurrentUser
            ? { ...item, read: true }
            : item;
        }),
      );
    };

    socket?.on("user-typing", onTyping);
    socket?.on("user-stop-typing", onStopTyping);
    socket?.on("message-received", onMessageReceived);
    socket?.on("messages-read", onMessagesRead);

    return () => {
      socket?.off("user-typing", onTyping);
      socket?.off("user-stop-typing", onStopTyping);
      socket?.off("message-received", onMessageReceived);
      socket?.off("messages-read", onMessagesRead);
    };
  }, [selectedUserId, currentUserId]);

  useEffect(() => {
    if (selectedUserId !== prevSelectedUserRef.current) {
      prevSelectedUserRef.current = selectedUserId;
      window.setTimeout(() => scrollToBottom(true), 60);
      return;
    }

    if (!chatMessages.length) return;
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.from === currentUserId || isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [chatMessages, selectedUserId, scrollToBottom, currentUserId]);

  useEffect(() => {
    if (!selectedUserId || !currentUserId) return;

    const hasUnread = chatMessages.some(
      (item) => item.to === currentUserId && item.from === selectedUserId && !item.read,
    );

    if (!hasUnread) return;

    setChatMessages((prev) =>
      prev.map((item) =>
        item.to === currentUserId && item.from === selectedUserId
          ? { ...item, read: true }
          : item,
      ),
    );

    void markConversationMessagesAsRead(selectedUserId);
  }, [chatMessages, currentUserId, selectedUserId]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSearchParams({ to: userId });
    setMobileSidebarOpen(false);
    setShowNewChat(false);
    setUserSearchQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 120);
  };

  const onSend = async () => {
    if (!selectedUserId || !draft.trim() || isSending) return;

    setIsSending(true);
    const text = draft;
    setDraft("");

    try {
      const sent = await sendCurrentUserMessage({ to: selectedUserId, text });
      setChatMessages((prev) => mergeChatItems([...prev, sent]));
      socketService.sendStopTyping(selectedUserId);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    } catch {
      setDraft(text);
      toast.error("Unable to send message");
    } finally {
      setIsSending(false);
    }
  };

  const isUserOnline = (userId: string) => presence.get(userId)?.status === "online";

  const formatLastSeen = (userId: string) => {
    const info = presence.get(userId);
    if (!info) return "Offline";
    if (info.status === "online") return "Online";
    if (!info.lastSeen) return "Offline";
    const diff = Date.now() - info.lastSeen;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Last seen just now";
    if (mins < 60) return `Last seen ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Last seen ${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Last seen yesterday";
    return `Last seen ${days}d ago`;
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatSidebarTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDraftChange = (value: string) => {
    setDraft(value);

    if (selectedUserId && value.trim()) {
      socketService.sendTyping(selectedUserId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendStopTyping(selectedUserId);
      }, 2000);
    } else if (selectedUserId) {
      socketService.sendStopTyping(selectedUserId);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen liquid-page">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} />

      <main className="mx-auto flex h-[calc(100vh-128px)] max-w-[1600px] gap-3 px-3 pb-3 pt-[132px] sm:gap-4 sm:px-4">
        <aside
          className={`
            ${mobileSidebarOpen ? "flex" : "hidden md:flex"}
            liquid-panel mesh-surface w-full md:w-[360px] lg:w-[410px] shrink-0 flex-col overflow-hidden
          `}
        >
          <div className="border-b border-white/60 px-4 pb-4 pt-5 dark:border-white/10">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-navy/55 dark:text-white/45">
                  Coordination Channel
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-navy-dark dark:text-white font-display">
                  Messages
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Fast officer-to-officer collaboration with live presence.
                </p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-right shadow-sm dark:border-white/10 dark:bg-slate-900/50">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Unread</p>
                <p className="text-lg font-black text-gold-dark dark:text-gold">{totalUnread}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={showNewChat ? "Search officers to message..." : "Search conversations..."}
                  value={userSearchQuery}
                  onChange={(event) => setUserSearchQuery(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/70 bg-white/75 pl-9 pr-4 text-[13px] text-slate-700 outline-none ring-0 transition-all placeholder:text-slate-400 focus:border-gold/40 focus:bg-white dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-100"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-2xl border border-white/70 bg-white/70 text-navy hover:bg-white dark:border-white/10 dark:bg-slate-950/45 dark:text-white"
                onClick={() => {
                  setShowNewChat((prev) => !prev);
                  setUserSearchQuery("");
                }}
                title="New conversation"
              >
                {showNewChat ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 pt-3 custom-scrollbar">
            {showNewChat ? (
              filteredUsers.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white/60 text-slate-400 dark:border-white/10 dark:bg-slate-900/40">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">No officers found</p>
                  <p className="mt-1 text-xs text-slate-400">Try another name, rank, or district.</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className="mb-1 flex w-full items-center gap-3 rounded-2xl border border-transparent bg-white/60 px-3 py-3 text-left transition-all hover:border-gold/25 hover:bg-white hover:shadow-sm dark:bg-slate-900/40 dark:hover:border-gold/20 dark:hover:bg-slate-900/70"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11 ring-1 ring-white/80 dark:ring-white/10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-navy text-sm font-bold text-white">
                          {user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isUserOnline(user.id) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{user.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {user.rank} · {user.district}
                      </p>
                    </div>
                  </button>
                ))
              )
            ) : isLoadingConversations ? (
              <div className="space-y-2 px-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-2.5 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300/80 bg-white/65 text-gold-dark shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:text-gold">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <p className="text-base font-bold text-slate-700 dark:text-white">No conversations yet</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Start a direct thread with a fellow officer to coordinate on ideas and implementation.
                </p>
                <Button
                  size="sm"
                  className="mt-4 rounded-xl bg-gold text-navy hover:bg-gold-dark"
                  onClick={() => {
                    setShowNewChat(true);
                    setUserSearchQuery("");
                  }}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Start Conversation
                </Button>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const active = selectedUserId === conversation.peerId;
                const isTyping = typingUsers.has(conversation.peerId);

                return (
                  <button
                    key={conversation.peerId}
                    onClick={() => handleUserSelect(conversation.peerId)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                      active
                        ? "border-gold/40 bg-white shadow-md dark:border-gold/30 dark:bg-slate-900/80"
                        : "border-transparent bg-white/60 hover:border-white/80 hover:bg-white hover:shadow-sm dark:bg-slate-900/40 dark:hover:border-white/10 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 ring-1 ring-white/90 dark:ring-white/10">
                        <AvatarImage src={conversation.peer.avatar} />
                        <AvatarFallback className="bg-navy text-sm font-bold text-white">
                          {conversation.peer.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isUserOnline(conversation.peerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                          {conversation.peer.name}
                        </p>
                        <span
                          className={`shrink-0 text-[10px] font-semibold ${
                            conversation.unreadCount > 0 ? "text-gold-dark dark:text-gold" : "text-slate-400"
                          }`}
                        >
                          {formatSidebarTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {conversation.lastMessage.from === currentUserId ? (
                          conversation.lastMessage.read ? (
                            <CheckCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                          ) : (
                            <Check className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          )
                        ) : null}
                        <p
                          className={`flex-1 truncate text-xs ${
                            conversation.unreadCount > 0 ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {isTyping ? (
                            <span className="font-semibold italic text-gold-dark dark:text-gold">typing...</span>
                          ) : (
                            conversation.lastMessage.text
                          )}
                        </p>
                        {conversation.unreadCount > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-black text-navy">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`
            ${!mobileSidebarOpen ? "flex" : "hidden md:flex"}
            liquid-panel chat-canvas relative min-w-0 flex-1 flex-col overflow-hidden
          `}
        >
          {selectedUserId ? (
            <>
              <header className="border-b border-white/60 bg-white/70 px-4 py-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy md:hidden dark:hover:bg-white/5 dark:hover:text-white"
                    onClick={() => {
                      setMobileSidebarOpen(true);
                      setSelectedUserId("");
                    }}
                    title="Back to conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => navigate(`/profile/${selectedUserId}`)}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 ring-1 ring-white/90 dark:ring-white/10">
                        <AvatarImage src={selectedUser?.avatar} />
                        <AvatarFallback className="bg-navy text-sm font-bold text-white">
                          {selectedUser?.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isUserOnline(selectedUserId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-slate-800 dark:text-white font-display">
                        {selectedUser?.name ?? "Officer"}
                      </h2>
                      {typingUsers.has(selectedUserId) ? (
                        <p className="text-xs font-semibold text-gold-dark dark:text-gold">typing...</p>
                      ) : (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {selectedUser?.rank ? `${selectedUser.rank} · ` : ""}
                          {formatLastSeen(selectedUserId)}
                        </p>
                      )}
                    </div>
                  </button>

                  {selectedUser?.district ? (
                    <div className="hidden rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-right shadow-sm sm:block dark:border-white/10 dark:bg-slate-900/40">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">District</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedUser.district}</p>
                    </div>
                  ) : null}
                </div>
              </header>

              <div
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-[10%] lg:px-[14%] custom-scrollbar"
              >
                {isLoadingMessages ? (
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[78%] animate-pulse rounded-[1.4rem] px-4 py-3 ${
                            index % 2 === 0
                              ? "bg-white/80 dark:bg-slate-800/80"
                              : "bg-gold/20 dark:bg-emerald-900/40"
                          }`}
                        >
                          <div className="h-3 w-44 rounded bg-slate-200 dark:bg-slate-700" />
                          <div className="mt-2 h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message, index) => {
                      const mine = message.from === currentUserId;
                      const prev = chatMessages[index - 1];
                      const next = chatMessages[index + 1];
                      const showDate = index === 0 || !isSameDay(message.createdAt, prev.createdAt);
                      const isFirstInGroup = !prev || prev.from !== message.from || showDate;
                      const isLastInGroup = !next || next.from !== message.from || !isSameDay(message.createdAt, next.createdAt);

                      return (
                        <div key={message.id}>
                          {showDate ? (
                            <div className="my-4 flex justify-center">
                              <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
                                {dateSeparatorLabel(message.createdAt)}
                              </span>
                            </div>
                          ) : null}

                          <div className={`flex ${mine ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-2" : "mt-1"}`}>
                            <div
                              className={`max-w-[82%] px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                                mine
                                  ? `bg-[linear-gradient(135deg,rgba(252,221,112,0.96),rgba(241,194,61,0.92))] text-navy ${
                                      isFirstInGroup
                                        ? "rounded-[1.4rem] rounded-br-md"
                                        : isLastInGroup
                                          ? "rounded-[1.4rem] rounded-tr-md"
                                          : "rounded-[1.4rem] rounded-r-md"
                                    }`
                                  : `border border-white/80 bg-white/92 text-slate-800 dark:border-white/10 dark:bg-slate-900/82 dark:text-slate-100 ${
                                      isFirstInGroup
                                        ? "rounded-[1.4rem] rounded-bl-md"
                                        : isLastInGroup
                                          ? "rounded-[1.4rem] rounded-tl-md"
                                          : "rounded-[1.4rem] rounded-l-md"
                                    }`
                              }`}
                            >
                              <p>{message.text}</p>
                              <span
                                className={`mt-2 inline-flex float-right items-center gap-1 text-[10px] ${
                                  mine ? "text-navy/65" : "text-slate-400"
                                }`}
                              >
                                {formatTime(message.createdAt)}
                                {mine ? (
                                  message.read ? (
                                    <CheckCheck className="h-3 w-3 text-sky-500" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )
                                ) : null}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {typingUsers.has(selectedUserId) ? (
                      <div className="mt-3 flex justify-start">
                        <div className="rounded-[1.4rem] rounded-bl-md border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-white/60 bg-white/70 px-4 py-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/50 sm:px-6 md:px-[10%] lg:px-[14%]">
                <div className="flex items-end gap-3">
                  <div className="flex-1 overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/85 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      placeholder="Message your fellow officer..."
                      className="max-h-28 min-h-[48px] w-full resize-none bg-transparent px-4 py-3 text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
                      value={draft}
                      onChange={(event) => {
                        handleDraftChange(event.target.value);
                        event.target.style.height = "auto";
                        event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void onSend();
                          if (inputRef.current) inputRef.current.style.height = "auto";
                        }
                      }}
                    />
                  </div>
                  <Button
                    disabled={!draft.trim() || isSending}
                    onClick={() => {
                      void onSend();
                      if (inputRef.current) inputRef.current.style.height = "auto";
                    }}
                    className="h-12 w-12 rounded-2xl bg-gold text-navy shadow-lg shadow-gold/20 transition-all hover:bg-gold-dark disabled:opacity-45"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/80 bg-white/80 text-gold-dark shadow-lg dark:border-white/10 dark:bg-slate-900/55 dark:text-gold">
                <MessageCircle className="h-9 w-9" />
              </div>
              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                Direct Collaboration
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-navy-dark dark:text-white font-display">
                Liquid, instant messaging for field innovation teams.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Open an existing thread or start a new conversation to coordinate pilot rollouts, approvals, and implementation details without waiting for the whole inbox to load.
              </p>
              <Button
                className="mt-6 rounded-2xl bg-gold text-navy hover:bg-gold-dark"
                onClick={() => {
                  setShowNewChat(true);
                  setMobileSidebarOpen(true);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Start New Conversation
              </Button>

              {knownUsers.length > 0 ? (
                <div className="mt-10 flex max-w-2xl flex-wrap justify-center gap-3">
                  {knownUsers.slice(0, 6).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user.id)}
                      className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/45 dark:hover:bg-slate-900/70"
                    >
                      <Avatar className="h-8 w-8 ring-1 ring-white/80 dark:ring-white/10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-navy text-[10px] font-bold text-white">
                          {user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-100">{user.name.split(" ")[0]}</p>
                        <p className="text-[10px] text-slate-400">{user.rank}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MessagesPage;
