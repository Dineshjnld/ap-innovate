import { MOCK_PROJECTS, MOCK_CURRENT_USER } from "@/data/mockData";
import { BarChart3, FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";

const StatsBar = () => {
  const stats = [
    { label: "Total Innovations", value: MOCK_PROJECTS.length, icon: <FileText className="h-5 w-5 text-info" />, bg: "bg-info/10" },
    { label: "Approved", value: MOCK_PROJECTS.filter(p => p.status === "approved").length, icon: <CheckCircle2 className="h-5 w-5 text-success" />, bg: "bg-success/10" },
    { label: "Under Review", value: MOCK_PROJECTS.filter(p => p.status === "under_review").length, icon: <Clock className="h-5 w-5 text-warning" />, bg: "bg-warning/10" },
    { label: "Districts Active", value: new Set(MOCK_PROJECTS.map(p => p.district)).size, icon: <TrendingUp className="h-5 w-5 text-gold-dark" />, bg: "bg-gold/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl bg-card border border-border shadow-card px-4 py-3 flex items-center gap-3">
          <div className={`rounded-lg p-2 ${stat.bg}`}>
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
