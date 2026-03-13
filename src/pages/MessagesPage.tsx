import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/data/mockData";
import type { MessageItem } from "@/services/database";
import { seedDatabaseIfEmpty } from "@/services/database";
import { getKnownUsers } from "@/services/auth";
import {
  markConversationMessagesAsRead,
  sendCurrentUserMessage,
  subscribeCurrentUserMessages,
  subscribeDiscoverUsers,
} from "@/services/realtime";

const MessagesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get("to") ?? "");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const currentUserId = session?.user.id ?? "";
  const knownUsers = useMemo(() => {
    const map = new Map<string, User>();
    getKnownUsers().forEach((user) => {
      map.set(user.id, user);
    });
    discoverUsers.forEach((user) => {
      map.set(user.id, user);
    });

    return Array.from(map.values()).filter((user) => user.id !== currentUserId);
  }, [discoverUsers, currentUserId]);

  const resolveName = (userId: string) => {
    if (userId === currentUserId) {
      return "You";
    }
    return knownUsers.find((user) => user.id === userId)?.name ?? userId;
  };

  const formatListTime = (createdAt: number) =>
    new Date(createdAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatMessageTime = (createdAt: number) => {
    const date = new Date(createdAt);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    seedDatabaseIfEmpty();
    return subscribeCurrentUserMessages((items) => {
      setMessages(items);
    });
  }, []);

  useEffect(() => {
    return subscribeDiscoverUsers((users) => {
      setDiscoverUsers(users);
    });
  }, []);

  const conversations = useMemo(() => {
    const map = new Map<string, MessageItem[]>();

    for (const message of messages) {
      if (!message.from || !message.to || !message.text.trim()) {
        continue;
      }

      const peerId = message.from === currentUserId ? message.to : message.from;
      if (!peerId || peerId === currentUserId) {
        continue;
      }

      if (!map.has(peerId)) {
        map.set(peerId, []);
      }
      map.get(peerId)?.push(message);
    }

    return Array.from(map.entries())
      .map(([peerId, items]) => {
        const ordered = [...items].sort((a, b) => a.createdAt - b.createdAt);
        const lastMessage = ordered[ordered.length - 1];
        return {
          peerId,
          items: ordered,
          lastMessage,
        };
      })
      .sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
  }, [messages, currentUserId]);

  useEffect(() => {
    if (selectedUserId) {
      const selectedExists =
        selectedUserId !== currentUserId &&
        (knownUsers.some((user) => user.id === selectedUserId) || conversations.some((conversation) => conversation.peerId === selectedUserId));
      if (selectedExists) {
        return;
      }
      setSelectedUserId("");
      return;
    }

    if (searchParams.get("to")) {
      const fromQuery = searchParams.get("to") ?? "";
      if (fromQuery && fromQuery !== currentUserId) {
        setSelectedUserId(fromQuery);
      }
      return;
    }

    if (conversations.length > 0) {
      setSelectedUserId(conversations[0].peerId);
    }
  }, [conversations, currentUserId, knownUsers, searchParams, selectedUserId]);

  const selectedConversation = conversations.find((conversation) => conversation.peerId === selectedUserId);
  const chatMessages = useMemo(() => selectedConversation?.items ?? [], [selectedConversation]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    const hasUnread = chatMessages.some((item) => item.to === currentUserId && !item.read);
    if (!hasUnread) {
      return;
    }

    void markConversationMessagesAsRead(selectedUserId);
  }, [chatMessages, currentUserId, selectedUserId]);

  const onSend = async () => {
    if (!selectedUserId) {
      toast.error("Select a conversation");
      return;
    }

    if (selectedUserId === currentUserId) {
      toast.error("You cannot send messages to yourself");
      return;
    }

    if (!draft.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsSending(true);
    const result = await sendCurrentUserMessage({
      to: selectedUserId,
      text: draft,
    });
    setIsSending(false);

    if (!result) {
      toast.error("Unable to send message");
      return;
    }

    setMessages((current) => {
      if (current.some((item) => item.id === result.id)) {
        return current;
      }
      return [...current, result];
    });
    setDraft("");
  };

  const onCreateConversation = (peerId: string) => {
    if (peerId === currentUserId) {
      toast.error("You cannot start a chat with yourself");
      return;
    }
    setSelectedUserId(peerId);
    setDraft("");
  };

  const onDraftKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={(target) => navigate(target === "dashboard" ? "/hub" : "/create")} onSearchChange={() => undefined} />
      <main className="mx-auto max-w-6xl px-4 pt-40 pb-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-6 py-4">
            <h1 className="text-xl font-bold text-foreground font-display">Messages</h1>
            <p className="mt-1 text-sm text-muted-foreground">Realtime conversational chat across officer profiles</p>
          </div>

          <div className="grid min-h-[68vh] grid-cols-1 lg:grid-cols-[320px_1fr]">
            <aside className="border-r border-border bg-muted/10 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversations</p>

              <div className="mb-4">
                <select
                  title="Start new chat"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) {
                      onCreateConversation(event.target.value);
                    }
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Start new chat...</option>
                  {knownUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.rank}, {user.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.peerId}
                      type="button"
                      onClick={() => setSelectedUserId(conversation.peerId)}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        selectedUserId === conversation.peerId
                          ? "border-info/40 bg-info/10"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{resolveName(conversation.peerId)}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatListTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{conversation.lastMessage.text}</p>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="flex min-h-[68vh] flex-col">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  {selectedUserId ? resolveName(selectedUserId) : "Select a conversation"}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
                {!selectedUserId ? (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 text-center">
                    <MessageCircle className="h-7 w-7 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-foreground">Start a conversation</p>
                    <p className="mt-1 text-xs text-muted-foreground">Select a user from the left panel to begin realtime chat.</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 text-center">
                    <MessageCircle className="h-7 w-7 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-foreground">No messages yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Say hello to start this conversation.</p>
                  </div>
                ) : (
                  chatMessages.map((message) => {
                    const mine = message.from === currentUserId;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            mine
                              ? "bg-info text-info-foreground"
                              : "border border-border bg-muted/30 text-foreground"
                          }`}
                        >
                          <p>{message.text}</p>
                          <p className={`mt-1 text-[11px] ${mine ? "text-info-foreground/80" : "text-muted-foreground"}`}>
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border bg-card px-4 py-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Textarea
                    className="min-h-[70px]"
                    placeholder={selectedUserId ? `Message ${resolveName(selectedUserId)}` : "Select a conversation first"}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onDraftKeyDown}
                    disabled={!selectedUserId || isSending}
                  />
                  <Button
                    type="button"
                    onClick={() => void onSend()}
                    disabled={!selectedUserId || isSending || !draft.trim()}
                    className="h-full min-h-[70px]"
                  >
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
