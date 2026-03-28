import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Edit, FilePlus, ShieldCheck, XCircle } from "lucide-react";
import { subscribeActivityFeed } from "@/services/realtime";
import type { FeedItem } from "@/data/mockData";
import { socketService } from "@/services/socket";

interface LiveFlashTickerProps {
  onOpenProject: (projectId: string) => void;
}

const MAX_STREAM_ITEMS = 12;
const FLASH_CACHE_KEY = "apih_live_flash_items";

const readCachedFeed = (): FeedItem[] => {
  try {
    const raw = window.sessionStorage.getItem(FLASH_CACHE_KEY);
    return raw ? JSON.parse(raw) as FeedItem[] : [];
  } catch {
    return [];
  }
};

const writeCachedFeed = (items: FeedItem[]) => {
  try {
    window.sessionStorage.setItem(FLASH_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore cache write issues
  }
};

// Only project-level actions — no comments
const isProjectActivity = (item: FeedItem) =>
  !item.action.toLowerCase().includes("commented");

const actionMeta = (action: string): { icon: React.ReactNode; label: string; color: string } => {
  const a = action.toLowerCase();
  if (a.includes("approved"))
    return { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Project Approved", color: "text-success" };
  if (a.includes("rejected"))
    return { icon: <XCircle className="h-3.5 w-3.5" />, label: "Project Rejected", color: "text-destructive" };
  if (a.includes("review"))
    return { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Sent for Review", color: "text-warning" };
  if (a.includes("edited"))
    return { icon: <Edit className="h-3.5 w-3.5" />, label: "Project Updated", color: "text-info" };
  if (a.includes("submitted"))
    return { icon: <FilePlus className="h-3.5 w-3.5" />, label: "New Submission", color: "text-gold-dark" };
  return { icon: <Activity className="h-3.5 w-3.5" />, label: "Update", color: "text-muted-foreground" };
};

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const LiveFlashTicker = ({ onOpenProject }: LiveFlashTickerProps) => {
  const [items, setItems] = useState<FeedItem[]>(() => readCachedFeed());

  useEffect(() => {
    const socket = socketService.getSocket();

    const onNewActivity = (activity: FeedItem) => {
      if (!isProjectActivity(activity)) return;
      setItems((prev) => {
        if (prev.some((a) => a.id === activity.id)) return prev;
        const next = [...prev, activity];
        writeCachedFeed(next);
        return next;
      });
    };

    socket?.on("activity-created", onNewActivity);

    return () => {
      socket?.off("activity-created", onNewActivity);
    };
  }, []);

  useEffect(() => {
    return subscribeActivityFeed((feed) => {
      const filtered = feed.filter(isProjectActivity);
      setItems(filtered);
      writeCachedFeed(filtered);
    });
  }, []);

  const streamItems = useMemo(() => {
    const latest = items.slice(-MAX_STREAM_ITEMS);
    return [...latest, ...latest];
  }, [items]);

  const hasItems = streamItems.length > 0;
  const tickerSpeedClass = useMemo(() => {
    const count = Math.max(1, items.slice(-MAX_STREAM_ITEMS).length);
    if (count >= 10) return "live-flash-speed-fast";
    if (count >= 6) return "live-flash-speed-mid";
    return "live-flash-speed-slow";
  }, [items]);

  return (
    <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Activity className="h-3.5 w-3.5 text-success" />
        <h2 className="text-xs font-semibold text-foreground">Project Updates</h2>
      </div>

      <div className="relative h-[370px] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-card to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-card to-transparent" />

        {!hasItems ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
            Waiting for project updates...
          </div>
        ) : (
          <div className={`live-flash-track ${tickerSpeedClass}`}>
            {streamItems.map((item, index) => {
              const meta = actionMeta(item.action);
              return (
                <button
                  key={`${item.id}-${index}`}
                  type="button"
                  onClick={() => onOpenProject(item.projectId)}
                  className="flex h-[72px] w-full items-start gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60 ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                      {item.projectTitle}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      by {item.user.rank} {item.user.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFlashTicker;
