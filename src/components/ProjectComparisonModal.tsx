import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, AlertTriangle, CheckCircle, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ComparisonMatch {
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  projectCategory: string[];
  projectDistrict: string;
  projectStatus: string;
  likelihoodPercentage: number;
  reason: string;
}

export interface ComparisonResult {
  matches: ComparisonMatch[];
  summary: string;
  model: string;
}

interface ProjectComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;
  onNavigateToProject: (projectId: string) => void;
}

const getLikelihoodColor = (pct: number) => {
  if (pct >= 70) return "text-red-500 bg-red-500/10 border-red-500/30";
  if (pct >= 40) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
  return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
};

const getLikelihoodLabel = (pct: number) => {
  if (pct >= 70) return "High Similarity";
  if (pct >= 40) return "Moderate Similarity";
  return "Low Similarity";
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    submitted: "bg-blue-500/10 text-blue-500",
    under_review: "bg-amber-500/10 text-amber-500",
    approved: "bg-emerald-500/10 text-emerald-500",
    rejected: "bg-red-500/10 text-red-500",
    draft: "bg-gray-500/10 text-gray-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.draft}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const ProjectComparisonModal = ({
  isOpen,
  onClose,
  result,
  isLoading,
  error,
  onNavigateToProject,
}: ProjectComparisonModalProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open & scroll content to top on new results
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      contentRef.current?.scrollTo(0, 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, result]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ margin: 0 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="gradient-navy px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-bold text-primary-foreground font-display">AI Project Comparison</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-gold animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Analyzing with AI...</p>
                <p className="text-xs text-muted-foreground mt-1">Comparing your project against existing innovations</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Comparison Failed</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <>
              {/* Summary */}
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">AI Analysis Summary</p>
                <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
                <p className="text-xs text-muted-foreground mt-2">Model: {result.model}</p>
              </div>

              {/* Matches */}
              {result.matches.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">No Similar Projects Found</p>
                    <p className="text-xs text-muted-foreground mt-1">Your innovation appears to be unique. Go ahead and submit!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {result.matches.length} Similar Project{result.matches.length !== 1 ? "s" : ""} Found
                  </p>
                  {result.matches.map((match) => (
                    <div
                      key={match.projectId}
                      className={`rounded-lg border p-4 transition-colors hover:bg-muted/20 ${getLikelihoodColor(match.likelihoodPercentage)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-foreground truncate">{match.projectTitle}</h3>
                            <StatusBadge status={match.projectStatus} />
                          </div>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {match.projectCategory.map((cat) => (
                              <span key={cat} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {cat}
                              </span>
                            ))}
                            {match.projectDistrict && (
                              <span className="text-xs text-muted-foreground">• {match.projectDistrict}</span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{match.reason}</p>
                        </div>

                        <div className="shrink-0 text-center">
                          <div className="text-2xl font-bold">{match.likelihoodPercentage}%</div>
                          <div className="text-xs font-medium">{getLikelihoodLabel(match.likelihoodPercentage)}</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-current/10">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => onNavigateToProject(match.projectId)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Project
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-3 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ProjectComparisonModal;
