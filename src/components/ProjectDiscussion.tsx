import { useEffect, useMemo, useState, type FormEvent, useRef } from "react";
import { MessageSquareReply, Send, AtSign, User } from "lucide-react";
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

const depthClass = (depth: number) => {
  if (depth <= 0) return "ml-0";
  if (depth === 1) return "ml-4 md:ml-8 border-l-2 border-muted pl-4 md:pl-6";
  if (depth === 2) return "ml-4 md:ml-12 border-l-2 border-muted pl-4 md:pl-6";
  if (depth >= 3) return "ml-4 md:ml-16 border-l-2 border-muted pl-4 md:pl-6";
  return "ml-0";
};

const buildTree = (comments: DiscussionComment[]) => {
  const map = new Map<string, DiscussionNode>();

  comments.forEach((comment) => {
    map.set(comment.id, { ...comment, children: [] });
  });

  const roots: DiscussionNode[] = [];

  map.forEach((node) => {
    if (!node.parentId) {
      roots.push(node);
      return;
    }

    const parent = map.get(node.parentId);
    if (parent) {
      parent.children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
};

const CommentComposer = ({
  onSubmit,
  placeholder,
  autoFocus,
}: {
  onSubmit: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
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
      if (query.includes(" ")) {
        setShowMentions(false);
      } else {
        setMentionQuery(query);
      }
    }
  };

  const handleMentionSelect = (user: UserType) => {
    const parts = value.slice(0, textareaRef.current?.selectionStart).split("@");
    parts.pop();
    const prefix = parts.join("@");
    const suffix = value.slice(textareaRef.current?.selectionStart);
    const newValue = `${prefix}@${user.name} ${suffix}`;
    setValue(newValue);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const content = value.trim();
    if (content.length === 0) {
      return;
    }

    onSubmit(content);
    setValue("");
  };

  return (
    <div className="relative space-y-2">
      <form onSubmit={handleSubmit} className="relative rounded-xl border border-border bg-background shadow-sm transition-all focus-within:ring-2 focus-within:ring-gold/20">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={3}
          autoFocus={autoFocus}
          className="w-full resize-none rounded-t-xl bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between border-t border-border px-3 py-2 bg-muted/30 rounded-b-xl">
          <div className="flex gap-2 text-muted-foreground">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-gold" onClick={() => setShowMentions(true)}>
              <AtSign className="h-4 w-4" />
            </Button>
          </div>
          <Button type="submit" size="sm" className="bg-navy text-white hover:bg-navy-light shadow-md transition-all active:scale-95">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Post
          </Button>
        </div>
      </form>

      {showMentions && users.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg animate-in fade-in slide-in-from-top-2">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleMentionSelect(user)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 transition-colors"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{user.name}</span>
                <span className="text-[10px] text-muted-foreground">{user.rank}, {user.district}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CommentThread = ({
  node,
  depth,
  onReply,
}: {
  node: DiscussionNode;
  depth: number;
  onReply: (content: string, parentId: string) => void;
}) => {
  const [isReplying, setIsReplying] = useState(false);

  const formattedContent = useMemo(() => {
    if (!node.content) return null;
    // Basic mention highlighting
    const mentionRegex = /(@[a-zA-Z\s]+)/g;
    return node.content.split(mentionRegex).map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="font-semibold text-navy hover:underline cursor-pointer">{part}</span>;
      }
      return part;
    });
  }, [node.content]);

  if (!node.author) {
    return null;
  }

  return (
    <div className="group space-y-3">
      <div className={`relative flex gap-3 ${depthClass(depth)} transition-all`}>
        <Avatar className="h-8 w-8 mt-1 border border-border shadow-sm shrink-0">
          <AvatarImage src={node.author.avatar} />
          <AvatarFallback className="bg-navy-light text-white text-xs">
            {node.author.name ? node.author.name[0] : "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1.5">
          <div className="flex flex-col rounded-2xl bg-muted/40 px-4 py-3 shadow-sm border border-transparent group-hover:border-border transition-colors">
            <div className="flex items-center justify-between gap-2 overflow-hidden">
              <div className="flex items-baseline gap-1.5 overflow-hidden">
                <span className="text-sm font-bold text-navy truncate">{node.author.name}</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight truncate shrink-0">
                  {node.author.rank} • {node.author.district}
                </span>
              </div>
              <time className="text-[10px] text-muted-foreground shrink-0">
                {node.createdAt ? new Date(node.createdAt).toLocaleDateString() : "Now"}
              </time>
            </div>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {formattedContent}
            </div>
          </div>

          <div className="flex items-center gap-4 px-2">
            <button
              type="button"
              onClick={() => setIsReplying((prev) => !prev)}
              className="text-[11px] font-bold text-muted-foreground hover:text-navy hover:underline transition-colors flex items-center gap-1.5"
            >
              <MessageSquareReply className="h-3 w-3" />
              Reply
            </button>
          </div>

          {isReplying && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-1">
              <CommentComposer
                placeholder={`Reply to ${node.author.name}...`}
                autoFocus
                onSubmit={(content) => {
                  onReply(content, node.id);
                  setIsReplying(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-4 pt-1">
          {node.children.map((child) => (
            <CommentThread key={child.id} node={child} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectDiscussion = ({ comments, onCreateComment }: ProjectDiscussionProps) => {
  const tree = useMemo(() => buildTree(comments), [comments]);

  return (
    <section className="space-y-8 rounded-3xl bg-card border border-border/50 p-6 md:p-8 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center">
          <MessageSquareReply className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black text-navy font-display tracking-tight">Community Discussion</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">{comments.length} Observations Shared</p>
        </div>
      </div>

      <div className="border-t border-border/40 pt-6">
        <CommentComposer
          placeholder="Start a discussion or share an observation..."
          onSubmit={(content) => onCreateComment(content, null)}
        />
      </div>

      <div className="space-y-6 pt-4">
        {tree.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/10 px-6 py-12 text-center transition-all hover:bg-muted/20">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
              <MessageSquareReply className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-bold text-muted-foreground/80">No points of discussion yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts on this innovation.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {tree.map((node) => (
              <CommentThread
                key={node.id}
                node={node}
                depth={0}
                onReply={(content, parentId) => onCreateComment(content, parentId)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectDiscussion;
