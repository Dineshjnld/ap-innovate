import type { Project } from "@/data/mockData";
import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface StatsBarProps {
  projects: Project[];
}

const StatsBar = ({ projects }: StatsBarProps) => {
  const stats = [
    { label: "Total Innovations", value: projects.length, icon: <FileText className="h-5 w-5 text-info" />, bg: "bg-info/10" },
    { label: "Approved", value: projects.filter((p) => p.status === "approved").length, icon: <CheckCircle2 className="h-5 w-5 text-success" />, bg: "bg-success/10" },
    { label: "Under Review", value: projects.filter((p) => p.status === "under_review").length, icon: <Clock className="h-5 w-5 text-warning" />, bg: "bg-warning/10" },
    { label: "Districts Active", value: new Set(projects.map((p) => p.district)).size, icon: <TrendingUp className="h-5 w-5 text-gold-dark" />, bg: "bg-gold/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl bg-card border border-border shadow-card px-3 py-2 flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${stat.bg}`}>
            {stat.icon}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
