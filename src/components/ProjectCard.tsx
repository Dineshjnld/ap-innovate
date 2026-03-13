import { Project } from "@/data/mockData";
import {
  MapPin, Calendar, MessageSquare, CheckCircle2,
  Clock, FileText, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectCardProps {
  project: Project;
  onView: (id: string) => void;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  under_review: { label: "Under Review", className: "bg-warning/10 text-warning border-warning/20", icon: <Clock className="h-3 w-3" /> },
  submitted: { label: "Submitted", className: "bg-info/10 text-info border-info/20", icon: <FileText className="h-3 w-3" /> },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border", icon: <FileText className="h-3 w-3" /> },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <FileText className="h-3 w-3" /> },
};

const ProjectCard = ({ project, onView }: ProjectCardProps) => {
  const status = statusConfig[project.status];

  return (
    <button
      type="button"
      onClick={() => onView(project.id)}
      className="block w-full text-left rounded-xl bg-card border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group"
    >
      {/* Gold accent bar */}
      <div className="h-1 gradient-gold" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-foreground group-hover:text-navy-light transition-colors line-clamp-2 font-display">
            {project.title}
          </h3>
          <Badge variant="outline" className={`shrink-0 text-xs gap-1 ${status.className}`}>
            {status.icon}
            {status.label}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {project.problemStatement}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {project.district}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {project.createdAt}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {project.commentsCount} comments
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.category.map((cat) => (
            <span key={cat} className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold-dark">
              {cat}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy">
              {project.author.name.charAt(0)}
            </div>
            <span className="text-xs text-muted-foreground">
              {project.author.rank} {project.author.name}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-gold-dark group-hover:text-gold transition-colors">
            View <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
};

export default ProjectCard;
