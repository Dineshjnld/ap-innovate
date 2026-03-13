import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUp } from "lucide-react";
import { subscribeActivityFeed } from "@/services/realtime";
import type { FeedItem } from "@/data/mockData";
import { socketService } from "@/services/socket";

interface LiveFlashTickerProps {
  onOpenProject: (projectId: string) => void;
}

const MAX_STREAM_ITEMS = 12;

const LiveFlashTicker = ({ onOpenProject }: LiveFlashTickerProps) => {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const socket = socketService.getSocket();
    
    const onNewActivity = (activity: FeedItem) => {
      setItems((prev) => {
        // Avoid duplicates if polling also adds it
        if (prev.some(a => a.id === activity.id)) return prev;
        return [...prev, activity];
      });
    };

    socket?.on("activity-created", onNewActivity);

    return () => {
      socket?.off("activity-created", onNewActivity);
    };
  }, []);

  useEffect(() => {
    return subscribeActivityFeed((feed) => {
      setItems(feed);
    });
  }, []);

  const streamItems = useMemo(() => {
    const latest = items.slice(-MAX_STREAM_ITEMS);
    return [...latest, ...latest];
  }, [items]);

  const hasItems = streamItems.length > 0;
  const tickerSpeedClass = useMemo(() => {
    const count = Math.max(1, items.slice(-MAX_STREAM_ITEMS).length);
    if (count >= 10) {
      return "live-flash-speed-fast";
    }
    if (count >= 6) {
      return "live-flash-speed-mid";
    }
    return "live-flash-speed-slow";
  }, [items]);

  return (
    <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Activity className="h-4 w-4 text-success" />
        <h2 className="text-sm font-semibold text-foreground">Live Flash Updates</h2>
      </div>

      <div className="relative h-[370px] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-card to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-card to-transparent" />

        {!hasItems ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
            Waiting for live activity updates...
          </div>
        ) : (
          <div className={`live-flash-track ${tickerSpeedClass}`}>
            {streamItems.map((item, index) => (
              <button
                key={`${item.id}-${index}`}
                type="button"
                onClick={() => onOpenProject(item.projectId)}
                className="block h-[74px] w-full border-b border-border/60 px-4 text-left transition-colors hover:bg-muted/40"
              >
                <p className="mb-1 text-xs text-muted-foreground">{item.timestamp}</p>
                <p className="text-sm leading-snug text-foreground">
                  <ArrowUp className="mr-1 inline h-3.5 w-3.5 text-gold-dark" />
                  <span className="font-semibold">{item.user.rank} {item.user.name}</span> {item.action} {item.projectTitle}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFlashTicker;
