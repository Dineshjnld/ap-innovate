import { Project } from "@/data/mockData";
import { useState } from "react";
import {
  ArrowLeft, MapPin, Calendar, MessageSquare, CheckCircle2,
  Clock, FileText, Paperclip, ExternalLink, IndianRupee,
  History, XCircle, Share2, Check,
  Image as ImageIcon, Film, FileDown, X, Download,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/project/${project.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 text-xs bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? "Link Copied!" : "Share"}
              </Button>
              <Badge variant="outline" className={`text-sm gap-1.5 ${status.className}`}>
                {status.icon}
                {status.label}
              </Badge>
            </div>
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
              <Avatar className="h-10 w-10">
                <AvatarImage src={project.author.avatar} alt={project.author.name} />
                <AvatarFallback className="bg-navy/10 text-navy font-bold">
                  {project.author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link to={`/profile/${project.author.id}`} className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors">
                  {project.author.rank} {project.author.name}
                </Link>
                <p className="text-xs text-muted-foreground">{project.author.district} District</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <IndianRupee className="h-4 w-4 text-gold-dark" />
                {project.budget.toLocaleString("en-IN")}
              </div>
              {project.funding && (
                <span className="text-xs text-muted-foreground border-l border-border pl-4">
                  Funding: <span className="font-medium text-foreground">{project.funding}</span>
                </span>
              )}
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

          {/* ── Project Files ────────────────────────────────── */}
          {project.attachments.length > 0 && (
            <ProjectFiles files={project.attachments} />
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

          {/* Command Feedback / Approval */}
          {project.approvedBy && (
            <section className={`rounded-lg border-2 p-5 ${project.status === 'approved' ? 'border-success/30 bg-success/5' :
              project.status === 'rejected' ? 'border-destructive/30 bg-destructive/5' :
                'border-warning/30 bg-warning/5'
              }`}>
              <div className="flex items-center gap-2 mb-3">
                {project.status === 'approved' && <CheckCircle2 className="h-5 w-5 text-success" />}
                {project.status === 'rejected' && <XCircle className="h-5 w-5 text-destructive" />}
                {project.status === 'under_review' && <Clock className="h-5 w-5 text-warning" />}
                <h2 className={`text-lg font-bold font-display ${project.status === 'approved' ? 'text-success' :
                  project.status === 'rejected' ? 'text-destructive' :
                    'text-warning'
                  }`}>
                  {project.status === 'approved' ? 'Approved' :
                    project.status === 'rejected' ? 'Rejected' :
                      'Under Review'}
                </h2>
              </div>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{project.approvedBy.rank} {project.approvedBy.name}</span>
                {" • "}{project.approvedBy.date}
              </p>
              <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-border/50">
                <p className="text-sm text-muted-foreground italic">
                  "{project.approvedBy.comment}"
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
   File type helpers
   ──────────────────────────────────────────────────────────────────── */

const EXT_IMAGE = /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i;
const EXT_VIDEO = /\.(mp4|webm|mov|avi|mkv)$/i;
const EXT_PDF   = /\.pdf$/i;

type FileKind = "image" | "video" | "pdf" | "document";

const getFileKind = (url: string): FileKind => {
  if (EXT_IMAGE.test(url)) return "image";
  if (EXT_VIDEO.test(url)) return "video";
  if (EXT_PDF.test(url)) return "pdf";
  return "document";
};

const getFileName = (url: string) => {
  const parts = url.split("/");
  return parts[parts.length - 1] || url;
};

const kindIcon = (kind: FileKind) => {
  switch (kind) {
    case "image": return <ImageIcon className="h-4 w-4" />;
    case "video": return <Film className="h-4 w-4" />;
    case "pdf": return <FileText className="h-4 w-4" />;
    default: return <Paperclip className="h-4 w-4" />;
  }
};

/* ────────────────────────────────────────────────────────────────────
   Lightbox for images
   ──────────────────────────────────────────────────────────────────── */

const Lightbox = ({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
    >
      <X className="h-5 w-5" />
    </button>

    {images.length > 1 && (
      <>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous image"
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next image"
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </>
    )}

    <img
      src={images[index]}
      alt={getFileName(images[index])}
      className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    />

    {images.length > 1 && (
      <div className="absolute bottom-4 text-sm text-white/70">
        {index + 1} / {images.length}
      </div>
    )}
  </div>
);

/* ────────────────────────────────────────────────────────────────────
   ProjectFiles — renders all attachments grouped by type
   ──────────────────────────────────────────────────────────────────── */

const ProjectFiles = ({ files }: { files: string[] }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = files.filter((f) => getFileKind(f) === "image");
  const videos = files.filter((f) => getFileKind(f) === "video");
  const pdfs   = files.filter((f) => getFileKind(f) === "pdf");
  const docs   = files.filter((f) => getFileKind(f) === "document");

  return (
    <section>
      <h2 className="text-lg font-bold text-foreground font-display mb-4 flex items-center gap-2">
        <Paperclip className="h-5 w-5 text-muted-foreground" />
        Project Files
        <span className="text-sm font-normal text-muted-foreground">({files.length})</span>
      </h2>

      {/* ── Image Gallery ─────────────────────────────── */}
      {images.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> Images ({images.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:ring-2 hover:ring-primary/40 transition-all"
              >
                <img
                  src={src}
                  alt={getFileName(src)}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity">
                    View
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Videos ──────────────────────────────────────── */}
      {videos.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5" /> Videos ({videos.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videos.map((src) => (
              <div key={src} className="rounded-lg overflow-hidden border border-border bg-black">
                <video
                  src={src}
                  controls
                  preload="metadata"
                  className="w-full max-h-[360px]"
                />
                <div className="flex items-center justify-between px-3 py-2 bg-card border-t border-border">
                  <span className="text-xs text-muted-foreground truncate">{getFileName(src)}</span>
                  <a href={src} download className="text-xs text-info hover:underline flex items-center gap-1">
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PDFs ─────────────────────────────────────────── */}
      {pdfs.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documents ({pdfs.length})
          </p>
          <div className="space-y-3">
            {pdfs.map((src) => (
              <div key={src} className="rounded-lg border border-border overflow-hidden">
                <iframe
                  src={src}
                  title={getFileName(src)}
                  className="w-full h-[500px] bg-white"
                />
                <div className="flex items-center justify-between px-3 py-2 bg-card border-t border-border">
                  <span className="text-xs text-muted-foreground truncate">{getFileName(src)}</span>
                  <a href={src} download className="text-xs text-info hover:underline flex items-center gap-1">
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Other files ──────────────────────────────────── */}
      {docs.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileDown className="h-3.5 w-3.5" /> Other Files ({docs.length})
          </p>
          <div className="space-y-1.5">
            {docs.map((src) => (
              <a
                key={src}
                href={src}
                download
                className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                {kindIcon(getFileKind(src))}
                <span className="text-sm text-foreground flex-1 truncate">{getFileName(src)}</span>
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)}
          onNext={() => setLightboxIndex((lightboxIndex + 1) % images.length)}
        />
      )}
    </section>
  );
};

export default ProjectDetail;
