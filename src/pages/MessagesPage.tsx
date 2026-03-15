import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  MessageCircle, Send, Search, ArrowLeft, Check, CheckCheck,
  UserPlus, X,
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import type { User as UserType } from "@/data/mockData";
import type { MessageItem } from "@/services/database";
import {
  markConversationMessagesAsRead,
  sendCurrentUserMessage,
  subscribeCurrentUserMessages,
  subscribeDiscoverUsers,
} from "@/services/realtime";
import { socketService, type PresenceInfo } from "@/services/socket";

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const MessagesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<UserType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get("to") ?? "");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [presence, setPresence] = useState<Map<string, PresenceInfo>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const prevSelectedUserRef = useRef("");

  const currentUserId = session?.user.id ?? "";

  const knownUsers = useMemo(() => {
    return discoverUsers.filter((user) => user.id !== currentUserId);
  }, [discoverUsers, currentUserId]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return knownUsers;
    const q = userSearchQuery.toLowerCase();
    return knownUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.rank.toLowerCase().includes(q) ||
      u.district.toLowerCase().includes(q)
    );
  }, [knownUsers, userSearchQuery]);

  const scrollToBottom = useCallback((instant?: boolean) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
  }, []);

  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    if (selectedUserId !== prevSelectedUserRef.current) {
      prevSelectedUserRef.current = selectedUserId;
      setTimeout(() => scrollToBottom(true), 50);
      return;
    }
    if (!messages.length) return;
    const last = messages.filter(m =>
      (m.from === currentUserId && m.to === selectedUserId) ||
      (m.from === selectedUserId && m.to === currentUserId)
    ).sort((a, b) => a.createdAt - b.createdAt);
    const lastMsg = last[last.length - 1];
    if (lastMsg?.from === currentUserId || isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, selectedUserId, scrollToBottom, currentUserId]);

  useEffect(() => {
    return subscribeCurrentUserMessages((items) => {
      setMessages(items);
    });
  }, []);

  useEffect(() => {
    return subscribeDiscoverUsers((users) => {
      setDiscoverUsers(users);
    });
  }, []);

  useEffect(() => {
    return socketService.onPresenceChange((p) => {
      setPresence(new Map(p));
    });
  }, []);

  useEffect(() => {
    const socket = socketService.getSocket();
    const onTyping = (data: { from: string }) => {
      if (data.from) setTypingUsers((prev) => new Set(prev).add(data.from));
    };
    const onStopTyping = (data: { from: string }) => {
      if (data.from) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.from);
          return next;
        });
      }
    };
    socket?.on("user-typing", onTyping);
    socket?.on("user-stop-typing", onStopTyping);
    return () => {
      socket?.off("user-typing", onTyping);
      socket?.off("user-stop-typing", onStopTyping);
    };
  }, []);

  const conversations = useMemo(() => {
    const map = new Map<string, MessageItem[]>();
    for (const message of messages) {
      const peerId = message.from === currentUserId ? message.to : message.from;
      if (!peerId || peerId === currentUserId) continue;
      if (!map.has(peerId)) map.set(peerId, []);
      map.get(peerId)?.push(message);
    }

    return Array.from(map.entries())
      .map(([peerId, items]) => {
        const ordered = [...items].sort((a, b) => a.createdAt - b.createdAt);
        const lastMessage = ordered[ordered.length - 1];
        const unreadCount = items.filter(m => m.to === currentUserId && !m.read).length;
        return { peerId, items: ordered, lastMessage, unreadCount, user: knownUsers.find(u => u.id === peerId) };
      })
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
  }, [messages, currentUserId, knownUsers]);

  const selectedConversation = conversations.find(c => c.peerId === selectedUserId);
  const selectedUser = selectedConversation?.user || knownUsers.find(u => u.id === selectedUserId);
  const chatMessages = useMemo(() => selectedConversation?.items ?? [], [selectedConversation]);

  useEffect(() => {
    const unknownPeerIds = conversations.filter(c => !c.user).map(c => c.peerId);
    if (unknownPeerIds.length > 0) {
      void subscribeDiscoverUsers((users) => setDiscoverUsers(users));
    }
  }, [conversations]);

  useEffect(() => {
    if (!selectedUserId) return;
    const hasUnread = chatMessages.some((item) => item.to === currentUserId && !item.read);
    if (!hasUnread) return;
    void markConversationMessagesAsRead(selectedUserId);
  }, [chatMessages, currentUserId, selectedUserId]);

  const onSend = async () => {
    if (!selectedUserId || !draft.trim() || isSending) return;
    setIsSending(true);
    const text = draft;
    setDraft("");
    const result = await sendCurrentUserMessage({ to: selectedUserId, text });
    setIsSending(false);
    if (!result) {
      setDraft(text);
      toast.error("Unable to send message");
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSearchParams({ to: userId });
    setMobileSidebarOpen(false);
    setShowNewChat(false);
    setUserSearchQuery("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isUserOnline = (userId: string) => presence.get(userId)?.status === "online";

  const formatLastSeen = (userId: string): string => {
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
    if (days < 7) return `Last seen ${days}d ago`;
    return `Last seen ${new Date(info.lastSeen).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
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

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatSidebarTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const totalUnread = useMemo(() => conversations.reduce((s, c) => s + c.unreadCount, 0), [conversations]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="h-screen flex flex-col bg-[#f0f2f5] dark:bg-slate-950">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} />

      <main className="flex-1 flex overflow-hidden pt-[128px]">
        {/* ============ SIDEBAR ============ */}
        <aside
          className={`
            ${mobileSidebarOpen ? "flex" : "hidden md:flex"}
            w-full md:w-[380px] lg:w-[420px] flex-col border-r border-border bg-white dark:bg-slate-900 shrink-0 z-20
          `}
        >
          {/* Sidebar Header */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-tight font-display">
                Messages
                {totalUnread > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-black bg-gold text-navy rounded-full align-middle">
                    {totalUnread}
                  </span>
                )}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-slate-500 hover:text-navy hover:bg-slate-100"
                onClick={() => { setShowNewChat(!showNewChat); setUserSearchQuery(""); }}
                title="New conversation"
              >
                {showNewChat ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={showNewChat ? "Search officers to message..." : "Search conversations..."}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg pl-9 pr-4 py-2 text-[13px] focus:ring-2 focus:ring-gold/30 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all border-0"
              />
            </div>
          </div>

          {/* Conversation list OR New-chat user picker */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {showNewChat ? (
              /* New chat: show all officers */
              <div className="p-1.5">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No officers found</p>
                ) : (
                  filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleUserSelect(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatar} />
                          <AvatarFallback className="bg-navy/10 text-navy text-xs font-bold">{u.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${isUserOnline(u.id) ? "bg-emerald-500" : "bg-slate-300"}`} />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{u.rank} &middot; {u.district}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              /* Existing conversations */
              <div className="p-1.5">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
                      <MessageCircle className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">No conversations yet</p>
                    <p className="text-xs text-slate-400 mb-4">Start a conversation with a fellow officer</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5"
                      onClick={() => setShowNewChat(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> New Message
                    </Button>
                  </div>
                ) : (
                  (userSearchQuery
                    ? conversations.filter(c => c.user?.name.toLowerCase().includes(userSearchQuery.toLowerCase()))
                    : conversations
                  ).map((conv) => {
                    const active = selectedUserId === conv.peerId;
                    const isTyping = typingUsers.has(conv.peerId);
                    return (
                      <button
                        key={conv.peerId}
                        onClick={() => handleUserSelect(conv.peerId)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors mb-0.5 ${
                          active
                            ? "bg-gold/10 dark:bg-gold/5"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-[46px] w-[46px]">
                            <AvatarImage src={conv.user?.avatar} />
                            <AvatarFallback className="bg-navy text-white text-sm font-bold">
                              {conv.user?.name?.[0] ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${isUserOnline(conv.peerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex justify-between items-baseline gap-2">
                            <h3 className={`text-[13px] truncate ${conv.unreadCount > 0 ? "font-black text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-200"}`}>
                              {conv.user?.name || "Unknown"}
                            </h3>
                            <span className={`text-[10px] shrink-0 ${conv.unreadCount > 0 ? "text-gold font-bold" : "text-slate-400"}`}>
                              {formatSidebarTime(conv.lastMessage.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {conv.lastMessage.from === currentUserId && (
                              <span className="shrink-0 text-slate-400">
                                {conv.lastMessage.read
                                  ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                  : <Check className="h-3.5 w-3.5" />
                                }
                              </span>
                            )}
                            <p className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-400"}`}>
                              {isTyping ? (
                                <span className="text-gold font-semibold italic">typing...</span>
                              ) : (
                                conv.lastMessage.text
                              )}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-gold text-navy text-[10px] font-black rounded-full px-1 shrink-0">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ============ CHAT AREA ============ */}
        <section
          className={`
            ${!mobileSidebarOpen ? "flex" : "hidden md:flex"}
            flex-1 flex-col bg-[#efeae2] dark:bg-slate-950 min-w-0
          `}
        >
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <header className="h-[60px] px-4 border-b border-border flex items-center gap-3 bg-white dark:bg-slate-900 shrink-0 z-10">
                {/* Back button — mobile only */}
                <button
                  className="md:hidden shrink-0 p-1.5 -ml-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  onClick={() => { setMobileSidebarOpen(true); setSelectedUserId(""); }}
                  title="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/profile/${selectedUserId}`)}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={selectedUser?.avatar} />
                      <AvatarFallback className="bg-navy text-white text-xs font-bold">{selectedUser?.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isUserOnline(selectedUserId) ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">{selectedUser?.name || "Officer"}</h2>
                    {typingUsers.has(selectedUserId) ? (
                      <p className="text-[11px] font-semibold text-gold animate-pulse leading-tight">typing...</p>
                    ) : (
                      <p className={`text-[11px] leading-tight ${isUserOnline(selectedUserId) ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                        {formatLastSeen(selectedUserId)}
                      </p>
                    )}
                  </div>
                </div>

                {selectedUser?.rank && (
                  <span className="hidden sm:block text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium shrink-0">
                    {selectedUser.rank}
                  </span>
                )}
              </header>

              {/* Messages Feed */}
              <div
                ref={chatContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-[10%] lg:px-[15%] py-3 custom-scrollbar"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
              >
                {chatMessages.map((msg, idx) => {
                  const mine = msg.from === currentUserId;
                  const prevMsg = chatMessages[idx - 1];
                  const nextMsg = chatMessages[idx + 1];
                  const showDate = idx === 0 || !isSameDay(msg.createdAt, prevMsg.createdAt);
                  const isFirstInGroup = !prevMsg || prevMsg.from !== msg.from || showDate;
                  const isLastInGroup = !nextMsg || nextMsg.from !== msg.from || (nextMsg && !isSameDay(msg.createdAt, nextMsg.createdAt));

                  return (
                    <div key={msg.id}>
                      {/* Date separator */}
                      {showDate && (
                        <div className="flex justify-center my-3">
                          <span className="text-[11px] font-semibold text-slate-500 bg-white/80 dark:bg-slate-800/80 shadow-sm rounded-lg px-3 py-1">
                            {dateSeparatorLabel(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${mine ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-2" : "mt-0.5"}`}>
                        <div
                          className={`relative max-w-[80%] sm:max-w-[70%] px-3 py-1.5 text-[13.5px] leading-relaxed ${
                            mine
                              ? `bg-[#d9fdd3] dark:bg-emerald-900/60 text-slate-900 dark:text-slate-50 ${isFirstInGroup ? "rounded-t-lg rounded-bl-lg rounded-tr-sm" : isLastInGroup ? "rounded-b-lg rounded-tl-lg rounded-br-sm" : "rounded-l-lg rounded-r-sm"}`
                              : `bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm ${isFirstInGroup ? "rounded-t-lg rounded-br-lg rounded-tl-sm" : isLastInGroup ? "rounded-b-lg rounded-tr-lg rounded-bl-sm" : "rounded-r-lg rounded-l-sm"}`
                          }`}
                        >
                          <span>{msg.text}</span>
                          <span className={`inline-flex items-center gap-0.5 ml-2 float-right mt-1.5 text-[10px] whitespace-nowrap ${mine ? "text-slate-500 dark:text-emerald-300/60" : "text-slate-400"}`}>
                            {formatTime(msg.createdAt)}
                            {mine && (
                              msg.read
                                ? <CheckCheck className="h-3 w-3 text-blue-500 ml-0.5" />
                                : <Check className="h-3 w-3 text-slate-400 ml-0.5" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator bubble */}
                {typingUsers.has(selectedUserId) && (
                  <div className="flex justify-start mt-2">
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl rounded-tl-sm px-4 py-2.5">
                      <div className="flex gap-1 items-center">
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-3 sm:px-6 md:px-[10%] lg:px-[15%] py-2 bg-[#f0f2f5] dark:bg-slate-900 shrink-0 border-t border-border/50">
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-gold/50 transition-colors overflow-hidden">
                    <textarea
                      ref={inputRef}
                      placeholder="Type a message..."
                      className="w-full bg-transparent px-4 py-2.5 text-[13.5px] outline-none resize-none min-h-[42px] max-h-28 placeholder:text-slate-400"
                      rows={1}
                      value={draft}
                      onChange={(e) => {
                        handleDraftChange(e.target.value);
                        // Auto-grow
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void onSend();
                          // Reset height
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
                    className="h-[42px] w-[42px] shrink-0 rounded-full bg-gold hover:bg-gold/90 text-navy shadow-md transition-all active:scale-90 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-20 w-20 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-gold mb-5">
                <MessageCircle className="h-9 w-9" />
              </div>
              <h2 className="text-xl font-black text-slate-700 dark:text-white tracking-tight mb-2 font-display">
                AP Innovation Hub Messenger
              </h2>
              <p className="max-w-sm text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed mb-6">
                Select a conversation or start a new one to collaborate with your fellow officers on innovative projects.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => { setShowNewChat(true); setMobileSidebarOpen(true); }}
              >
                <UserPlus className="h-3.5 w-3.5" /> Start New Conversation
              </Button>

              {/* Quick picks: recent officers */}
              {knownUsers.length > 0 && (
                <div className="mt-8 w-full max-w-xs">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3">Quick Connect</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {knownUsers.slice(0, 6).map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleUserSelect(u.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-left"
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={u.avatar} />
                          <AvatarFallback className="text-[10px] bg-navy/10 text-navy font-bold">{u.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{u.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MessagesPage;
