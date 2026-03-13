import { Project } from "@/data/mockData";
import {
  ArrowLeft, MapPin, Calendar, MessageSquare, CheckCircle2,
  Clock, FileText, Paperclip, ExternalLink, IndianRupee,
  User as UserIcon, History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  under_review: { label: "Under Review", className: "bg-warning/10 text-warning border-warning/20", icon: <Clock className="h-3.5 w-3.5" /> },
  submitted: { label: "Submitted", className: "bg-info/10 text-info border-info/20", icon: <FileText className="h-3.5 w-3.5" /> },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border", icon: <FileText className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20", icon: <FileText className="h-3.5 w-3.5" /> },
};

const ProjectDetail = ({ project, onBack }: ProjectDetailProps) => {
  const status = statusConfig[project.status];

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </Button>

      <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
        {/* Header */}
        <div className="gradient-navy px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-primary-foreground font-display mb-2">
                {project.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground/70">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {project.district}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {project.createdAt}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> {project.commentsCount} comments
                </span>
                <span className="flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> v{project.versions}
                </span>
              </div>
            </div>
            <Badge variant="outline" className={`text-sm gap-1.5 ${status.className}`}>
              {status.icon}
              {status.label}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {project.category.map((cat) => (
              <span key={cat} className="rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-gold">
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Author & Budget */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-navy/10 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-navy" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{project.author.rank} {project.author.name}</p>
                <p className="text-xs text-muted-foreground">{project.author.district} District</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <IndianRupee className="h-4 w-4 text-gold-dark" />
              {project.budget.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Problem Statement */}
          <section>
            <h2 className="text-lg font-bold text-foreground font-display mb-3">Problem Statement</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{project.problemStatement}</p>
          </section>

          {/* Proposed Solution */}
          <section>
            <h2 className="text-lg font-bold text-foreground font-display mb-3">Proposed Solution</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{project.proposedSolution}</p>
          </section>

          {/* Attachments */}
          {project.attachments.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground font-display mb-3">Attachments</h2>
              <div className="space-y-2">
                {project.attachments.map((file) => (
                  <div key={file} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{file}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* External Links */}
          {project.externalLinks.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground font-display mb-3">External Links</h2>
              <div className="space-y-2">
                {project.externalLinks.map((link) => (
                  <div key={link} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5">
                    <ExternalLink className="h-4 w-4 text-info" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-info underline-offset-2 hover:underline"
                    >
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Approval */}
          {project.approvedBy && (
            <section className="rounded-lg border-2 border-success/30 bg-success/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h2 className="text-lg font-bold text-success font-display">Approved</h2>
              </div>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{project.approvedBy.rank} {project.approvedBy.name}</span>
                {" • "}{project.approvedBy.date}
              </p>
              <p className="text-sm text-muted-foreground mt-2 italic">
                "{project.approvedBy.comment}"
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
