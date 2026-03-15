import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MessageCircle, Send, Search, User, MoreVertical, Plus, Smile } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
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

  const scrollToBottom = (instant?: boolean) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
  };

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
  }, [messages, selectedUserId]);

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

  // Subscribe to presence updates
  useEffect(() => {
    return socketService.onPresenceChange((p) => {
      setPresence(new Map(p));
    });
  }, []);

  // Subscribe to typing indicators
  useEffect(() => {
    const socket = socketService.getSocket();
    const onTyping = (data: { from: string }) => {
      if (data.from) {
        setTypingUsers((prev) => new Set(prev).add(data.from));
      }
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

      if (!map.has(peerId)) {
        map.set(peerId, []);
      }
      map.get(peerId)?.push(message);
    }

    return Array.from(map.entries())
      .map(([peerId, items]) => {
        const ordered = [...items].sort((a, b) => a.createdAt - b.createdAt);
        const lastMessage = ordered[ordered.length - 1];
        const unreadCount = items.filter(m => m.to === currentUserId && !m.read).length;
        return {
          peerId,
          items: ordered,
          lastMessage,
          unreadCount,
          user: knownUsers.find(u => u.id === peerId)
        };
      })
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
  }, [messages, currentUserId, knownUsers]);

  const selectedConversation = conversations.find(c => c.peerId === selectedUserId);
  const selectedUser = selectedConversation?.user || knownUsers.find(u => u.id === selectedUserId);
  const chatMessages = useMemo(() => selectedConversation?.items ?? [], [selectedConversation]);

  // Effect to fetch names for unknown peer IDs
  useEffect(() => {
    const unknownPeerIds = conversations
      .filter(c => !c.user)
      .map(c => c.peerId);

    if (unknownPeerIds.length > 0) {
      // Just re-fetching discover users usually populates the cache
      // In a real app we'd call fetchUserById for each one
      void subscribeDiscoverUsers((users) => {
        setDiscoverUsers(users);
      });
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
    setDraft(""); // Optimistic clear

    const result = await sendCurrentUserMessage({
      to: selectedUserId,
      text: text,
    });
    setIsSending(false);

    if (!result) {
      setDraft(text); // Restore on failure
      toast.error("Unable to send message");
      return;
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSearchParams({ to: userId });
  };

  const isUserOnline = (userId: string) => presence.get(userId)?.status === "online";

  const formatLastSeen = (userId: string): string => {
    const info = presence.get(userId);
    if (!info) return "Offline";
    if (info.status === "online") return "Active Now";
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

  // Emit typing events
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
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] dark:bg-slate-950">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} />

      <main className="mx-auto max-w-7xl px-2 pt-[140px] pb-2 h-screen flex flex-col">
        <div className="flex-1 flex overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-md">

          {/* Sidebar - Conversation List */}
          <aside className="w-80 border-r border-border flex flex-col bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <div className="p-4 border-b border-border space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-extrabold text-navy dark:text-white font-display">Messages</h1>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
              {conversations.length === 0 && !userSearchQuery ? (
                <div className="p-8 text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Conversations</p>
                  <p className="text-[10px] text-slate-400">Start discovery to connect with officers</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.peerId}
                    onClick={() => handleUserSelect(conv.peerId)}
                    className={`group w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedUserId === conv.peerId
                      ? "bg-white dark:bg-slate-800 shadow-md ring-1 ring-slate-200 dark:ring-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-sm">
                        <AvatarImage src={conv.user?.avatar} />
                        <AvatarFallback className="bg-navy text-white text-sm font-bold">
                          {conv.user?.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${isUserOnline(conv.peerId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{conv.user?.name || conv.peerId}</h3>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">{formatTime(conv.lastMessage.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-slate-900 dark:text-slate-200 font-bold" : "text-slate-400"}`}>
                          {conv.lastMessage.from === currentUserId ? "You: " : ""}{conv.lastMessage.text}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="h-4 min-w-4 flex items-center justify-center bg-gold text-navy-dark text-[10px] font-black rounded-full px-1 shadow-sm">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}

              {userSearchQuery && filteredUsers.map(u => (
                !conversations.some(c => c.peerId === u.id) && (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u.id)}
                    className="group w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all opacity-70"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{u.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left overflow-hidden">
                      <p className="text-sm font-bold truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tighter truncate">{u.rank}, {u.district}</p>
                    </div>
                  </button>
                )
              ))}
            </div>
          </aside>

          {/* Main Chat Area */}
          <section className="flex-1 flex flex-col bg-white dark:bg-slate-950">
            {selectedUserId ? (
              <>
                {/* Chat Header */}
                <header className="p-4 border-b border-border flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 shadow-sm ring-1 ring-border">
                        <AvatarImage src={selectedUser?.avatar} />
                        <AvatarFallback className="bg-navy text-white text-xs">{selectedUser?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isUserOnline(selectedUserId) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                    </div>
                    <div className="leading-tight">
                      <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{selectedUser?.name || 'Officer'}</h2>
                      {typingUsers.has(selectedUserId) ? (
                        <p className="text-[10px] font-bold text-gold uppercase tracking-[0.1em] animate-pulse">Typing...</p>
                      ) : (
                        <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${isUserOnline(selectedUserId) ? "text-emerald-500" : "text-slate-400"}`}>
                          {formatLastSeen(selectedUserId)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-navy hover:bg-slate-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </header>

                {/* Messages Feed */}
                <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/30 custom-scrollbar">
                  {chatMessages.map((msg, idx) => {
                    const mine = msg.from === currentUserId;
                    const prevMsg = chatMessages[idx - 1];
                    const showHeader = !prevMsg || prevMsg.from !== msg.from;

                    return (
                      <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${showHeader ? 'mt-2' : '-mt-4'}`}>
                        {showHeader && !mine && (
                          <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1">{selectedUser?.name}</span>
                        )}
                        <div className={`relative px-4 py-3 rounded-2xl text-sm max-w-[85%] md:max-w-[70%] shadow-premium group transition-all ${mine
                          ? "bg-navy text-white rounded-tr-none"
                          : "bg-white dark:bg-slate-800 text-slate-950 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                          }`}>
                          <p className="leading-relaxed">{msg.text}</p>
                          <span className={`text-[9px] mt-1 block h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all ${mine ? "text-slate-300" : "text-slate-400"}`}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border bg-white dark:bg-slate-950">
                  <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-gold/20 transition-all">
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-slate-400">
                      <Plus className="h-5 w-5" />
                    </Button>
                    <Textarea
                      placeholder="Type a message..."
                      className="flex-1 border-none bg-transparent shadow-none min-h-[44px] max-h-32 focus-visible:ring-0 py-2.5 px-0 resize-none text-sm placeholder:text-slate-400"
                      value={draft}
                      onChange={(e) => handleDraftChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void onSend();
                        }
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-slate-400">
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button
                      disabled={!draft.trim() || isSending}
                      onClick={() => void onSend()}
                      className="h-10 w-10 shrink-0 rounded-xl bg-gold hover:bg-gold-dark text-navy shadow-lg shadow-gold/10 transition-all active:scale-90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/20">
                <div className="h-24 w-24 rounded-full bg-gold/5 flex items-center justify-center text-gold mb-6 animate-pulse">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-navy dark:text-white tracking-tight">Innovation Hub Messenger</h2>
                <p className="max-w-xs mt-3 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  Secure, encrypted gateway for department collaboration. Select an officer to begin coordinating on projects.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-sm">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
