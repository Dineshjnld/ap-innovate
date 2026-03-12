import { MOCK_FEED } from "@/data/mockData";
import { Activity, ArrowRight, User as UserIcon } from "lucide-react";

interface LiveFeedProps {
  onViewProject: (id: string) => void;
}

const LiveFeed = ({ onViewProject }: LiveFeedProps) => {
  return (
    <div className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Activity className="h-4 w-4 text-success" />
        <span className="text-sm font-semibold text-foreground">Live Innovation Feed</span>
        <span className="ml-auto h-2 w-2 rounded-full bg-success animate-pulse" />
      </div>

      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {MOCK_FEED.map((item, i) => (
          <button
            key={item.id}
            onClick={() => onViewProject(item.projectId)}
            className="flex w-full items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-navy/10 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-navy" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{item.user.rank} {item.user.name}</span>{" "}
                <span className="text-muted-foreground">{item.action}</span>
              </p>
              <p className="text-sm font-medium text-gold-dark truncate">{item.projectTitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.timestamp}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
