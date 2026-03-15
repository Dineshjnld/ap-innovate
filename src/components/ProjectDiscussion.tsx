import { useEffect, useMemo, useState, type FormEvent, useRef } from "react";
import { MessageSquareReply, Send, AtSign, User, Reply, ChevronDown, ChevronRight, Clock } from "lucide-react";
import type { DiscussionComment, User as UserType } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchDiscoverUsers } from "@/services/database";

interface ProjectDiscussionProps {
  comments: DiscussionComment[];
  onCreateComment: (content: string, parentId: string | null) => void;
}

interface DiscussionNode extends DiscussionComment {
  children: DiscussionNode[];
}

const buildTree = (comments: DiscussionComment[]) => {
  const map = new Map<string, DiscussionNode>();
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: DiscussionNode[] = [];
  map.forEach((node) => {
    if (!node.parentId) { roots.push(node); return; }
    const parent = map.get(node.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
};

/* ────────────────────────────────────────────────────────────────────
   Time helpers
   ──────────────────────────────────────────────────────────────────── */

const timeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/* ────────────────────────────────────────────────────────────────────
   CompactComposer — slim inline composer
   ──────────────────────────────────────────────────────────────────── */

const CompactComposer = ({
  onSubmit,
  placeholder,
  autoFocus,
  onCancel,
}: {
  onSubmit: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) => {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [users, setUsers] = useState<UserType[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mentionQuery !== null) {
      fetchDiscoverUsers(mentionQuery).then(setUsers);
    }
  }, [mentionQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    const lastChar = newValue[e.target.selectionStart - 1];
    if (lastChar === "@") {
      setShowMentions(true);
      setMentionQuery("");
    } else if (showMentions) {
      const parts = newValue.slice(0, e.target.selectionStart).split("@");
      const query = parts[parts.length - 1];
      if (query.includes(" ")) setShowMentions(false);
      else setMentionQuery(query);
    }
  };

  const handleMentionSelect = (user: UserType) => {
    const pos = textareaRef.current?.selectionStart ?? value.length;
    const parts = value.slice(0, pos).split("@");
    parts.pop();
    const prefix = parts.join("@");
    const suffix = value.slice(pos);
    setValue(`${prefix}@${user.name} ${suffix}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const content = value.trim();
    if (!content) return;
    onSubmit(content);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-background shadow-sm focus-within:ring-1 focus-within:ring-primary/30 transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          autoFocus={autoFocus}
          className="w-full resize-none bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/60"
        />
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-border/50 bg-muted/20 rounded-b-lg">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowMentions(true)}
              className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              title="Mention someone"
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>
            <span className="text-[9px] text-muted-foreground/50 hidden sm:inline">Ctrl+Enter to send</span>
          </div>
          <div className="flex items-center gap-1">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-6 text-[10px] px-2">
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!value.trim()}
              className="h-6 text-[10px] px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="h-3 w-3 mr-1" /> Send
            </Button>
          </div>
        </div>
      </form>

      {showMentions && users.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-56 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleMentionSelect(user)}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-[8px] bg-primary/10">{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="font-medium text-foreground truncate block">{user.name}</span>
                <span className="text-[9px] text-muted-foreground">{user.rank}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
   CommentBubble — single comment with inline reply
   ──────────────────────────────────────────────────────────────────── */

const CommentBubble = ({
  node,
  depth,
  onReply,
}: {
  node: DiscussionNode;
  depth: number;
  onReply: (parentId: string, authorName: string) => void;
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const formattedContent = useMemo(() => {
    if (!node.content) return null;
    const mentionRegex = /(@[a-zA-Z\s]+?)(?=\s|$|@)/g;
    return node.content.split(mentionRegex).map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="font-semibold text-primary cursor-pointer hover:underline">{part}</span>;
      }
      return part;
    });
  }, [node.content]);

  if (!node.author) return null;

  const hasReplies = node.children && node.children.length > 0;
  const indentPx = Math.min(depth * 12, 36);

  return (
    <div style={{ marginLeft: depth > 0 ? indentPx : 0 }}>
      {/* Thread line connector */}
      <div className={`relative ${depth > 0 ? "border-l border-muted/50 pl-2" : ""}`}>
        {/* Comment */}
        <div className="group py-0.5">
          <div className="flex items-start gap-1.5">
            <Avatar className="h-5 w-5 shrink-0 mt-0.5">
              <AvatarImage src={node.author.avatar} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                {node.author.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Name + time inline */}
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[11px] font-bold text-foreground truncate">{node.author.name}</span>
                <span className="text-[8px] text-muted-foreground">{node.author.rank}</span>
                <span className="text-[8px] text-muted-foreground/50 ml-auto shrink-0">
                  {node.createdAt ? timeAgo(node.createdAt) : "now"}
                </span>
              </div>

              {/* Message body */}
              <div className="text-[11px] text-foreground/90 leading-snug whitespace-pre-wrap">
                {formattedContent}
              </div>

              {/* Actions bar */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onReply(node.id, node.author.name)}
                  className="text-[9px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                >
                  <Reply className="h-2.5 w-2.5" /> Reply
                </button>
                {hasReplies && (
                  <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-[9px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    {collapsed ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                    {node.children.length} {node.children.length === 1 ? "reply" : "replies"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nested replies */}
        {hasReplies && !collapsed && (
          <div className="space-y-0">
            {node.children.map((child) => (
              <CommentBubble key={child.id} node={child} depth={depth + 1} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
   ProjectDiscussion — main panel
   ──────────────────────────────────────────────────────────────────── */

const ProjectDiscussion = ({ comments, onCreateComment }: ProjectDiscussionProps) => {
  const tree = useMemo(() => buildTree(comments), [comments]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [replyTo, setReplyTo] = useState<{ parentId: string; authorName: string } | null>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!scrolledUp) scrollToBottom();
  }, [comments.length, scrolledUp]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setScrolledUp(scrollHeight - scrollTop - clientHeight > 80);
  };

  return (
    <div className="flex flex-col rounded-xl bg-card border border-border shadow-lg overflow-hidden h-[calc(100vh-160px)]">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
        <MessageSquareReply className="h-3.5 w-3.5 text-primary shrink-0" />
        <h2 className="text-xs font-bold text-foreground">Discussion</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">{comments.length} msg{comments.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Messages ───────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-1 space-y-0 [scrollbar-width:thin]"
      >
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquareReply className="h-5 w-5 text-muted-foreground/40 mb-1" />
            <p className="text-[11px] text-muted-foreground/60">No discussion yet</p>
          </div>
        ) : (
          tree.map((node) => (
            <CommentBubble
              key={node.id}
              node={node}
              depth={0}
              onReply={(parentId, authorName) => setReplyTo({ parentId, authorName })}
            />
          ))
        )}
      </div>

      {/* ── Scroll-to-bottom indicator ─────────────────── */}
      {scrolledUp && (
        <div className="px-3 py-1 border-t border-border/50 bg-muted/20 shrink-0">
          <button
            type="button"
            onClick={() => { setScrolledUp(false); scrollToBottom(); }}
            className="w-full text-center text-[10px] font-semibold text-primary hover:underline"
          >
            ↓ New messages below
          </button>
        </div>
      )}

      {/* ── Composer (pinned to bottom) ────────────────── */}
      <div className="px-2 py-1.5 border-t border-border bg-card shrink-0">
        {replyTo && (
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5">
              <Reply className="h-2.5 w-2.5" /> Replying to {replyTo.authorName}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}
        <CompactComposer
          key={replyTo?.parentId ?? "root"}
          placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : "Write a message..."}
          autoFocus={!!replyTo}
          onCancel={replyTo ? () => setReplyTo(null) : undefined}
          onSubmit={(content) => {
            onCreateComment(content, replyTo?.parentId ?? null);
            setReplyTo(null);
          }}
        />
      </div>
    </div>
  );
};

export default ProjectDiscussion;
