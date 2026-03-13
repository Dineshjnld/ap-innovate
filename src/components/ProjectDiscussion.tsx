import { useMemo, useState, type FormEvent } from "react";
import { MessageSquareReply, Send } from "lucide-react";
import type { DiscussionComment } from "@/data/mockData";
import { Button } from "@/components/ui/button";

interface ProjectDiscussionProps {
  comments: DiscussionComment[];
  onCreateComment: (content: string, parentId: string | null) => void;
}

interface DiscussionNode extends DiscussionComment {
  children: DiscussionNode[];
}

const depthClass = (depth: number) => {
  if (depth <= 0) return "ml-0";
  if (depth === 1) return "ml-5";
  if (depth === 2) return "ml-10";
  if (depth === 3) return "ml-14";
  return "ml-16";
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
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold/40"
      />
      <Button type="submit" size="sm" className="bg-gold text-navy-dark hover:bg-gold-dark">
        <Send className="h-3.5 w-3.5 mr-1" />
        Post
      </Button>
    </form>
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

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border border-border bg-card px-3 py-3 ${depthClass(depth)}`}>
        <p className="text-xs text-muted-foreground mb-1">
          {node.author.rank} {node.author.name} • {new Date(node.createdAt).toLocaleString("en-IN")}
        </p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{node.content}</p>

        <button
          type="button"
          onClick={() => setIsReplying((prev) => !prev)}
          className="mt-2 text-xs font-medium text-info hover:text-info/80 inline-flex items-center gap-1"
        >
          <MessageSquareReply className="h-3 w-3" /> Reply
        </button>

        {isReplying && (
          <div className="mt-3">
            <CommentComposer
              placeholder="Write a reply"
              autoFocus
              onSubmit={(content) => {
                onReply(content, node.id);
                setIsReplying(false);
              }}
            />
          </div>
        )}
      </div>

      {node.children.map((child) => (
        <CommentThread key={child.id} node={child} depth={depth + 1} onReply={onReply} />
      ))}
    </div>
  );
};

const ProjectDiscussion = ({ comments, onCreateComment }: ProjectDiscussionProps) => {
  const tree = useMemo(() => buildTree(comments), [comments]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground font-display">Live Discussion</h2>

      <div className="rounded-xl border border-border bg-muted/25 p-4">
        <CommentComposer
          placeholder="Start discussion or add an observation"
          onSubmit={(content) => onCreateComment(content, null)}
        />
      </div>

      <div className="space-y-3">
        {tree.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">
            No comments yet. Start the first discussion thread.
          </div>
        ) : (
          tree.map((node) => (
            <CommentThread
              key={node.id}
              node={node}
              depth={0}
              onReply={(content, parentId) => onCreateComment(content, parentId)}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default ProjectDiscussion;
