import { useState, useRef, useCallback } from "react";
import { CATEGORIES, DISTRICTS } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Link as LinkIcon, X, FileText, Loader2 } from "lucide-react";
import type { CreateProjectInput } from "@/services/database";
import { uploadFiles } from "@/services/realtime";
import { toast } from "sonner";

interface UploadedFile {
  url: string;
  originalName: string;
  size: number;
}

interface CreateProjectFormProps {
  onBack: () => void;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CreateProjectForm = ({ onBack, onSubmit }: CreateProjectFormProps) => {
  const [title, setTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [district, setDistrict] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [budget, setBudget] = useState("");
  const [funding, setFunding] = useState("Self Funding");
  const [externalLink, setExternalLink] = useState("");
  const [externalLinks, setExternalLinks] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const results = await uploadFiles(fileArray);
      setUploadedFiles((prev) => [...prev, ...results]);
      toast.success(`${results.length} file${results.length > 1 ? "s" : ""} uploaded successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const removeUploadedFile = (url: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.url !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedCategories.length === 0) {
      setError("Select at least one innovation category.");
      return;
    }

    if (budget.trim().length > 0 && Number(budget) < 0) {
      setError("Budget cannot be negative.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        title,
        category: selectedCategories,
        district,
        problemStatement: problem,
        proposedSolution: solution,
        budget: budget.trim().length > 0 ? Number(budget) : 0,
        funding: funding.trim() || "Self Funding",
        externalLinks,
        attachments: uploadedFiles.map((f) => f.url),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExternalLink = () => {
    const value = externalLink.trim();
    if (value.length === 0) {
      return;
    }

    if (externalLinks.includes(value)) {
      setExternalLink("");
      return;
    }

    setExternalLinks((prev) => [...prev, value]);
    setExternalLink("");
  };

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" onClick={onBack} className="mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </Button>

      <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
        <div className="gradient-navy px-6 py-5">
          <h1 className="text-xl font-bold text-primary-foreground font-display">Submit New Innovation</h1>
          <p className="text-sm text-primary-foreground/60 mt-1">Share your idea to improve policing across AP</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Project Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear, descriptive title"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/50 placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Innovation Categories *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedCategories.includes(cat)
                      ? "bg-gold text-navy-dark shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">District *</label>
            <select
              aria-label="District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/50"
              required
            >
              <option value="">Select district</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Problem Statement */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Problem Statement *</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Describe the problem you're addressing..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/50 resize-none placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Proposed Solution */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Proposed Solution *</label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Describe your proposed solution..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/50 resize-none placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Estimated Budget (₹)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 500000"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/50 placeholder:text-muted-foreground"
            />
          </div>

          {/* Funding */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Funding Source</label>
            <select
              aria-label="Funding Source"
              value={funding}
              onChange={(e) => setFunding(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value="Self Funding">Self Funding</option>
              <option value="Government Grant">Government Grant</option>
              <option value="CSR Funding">CSR Funding</option>
              <option value="Public-Private Partnership">Public-Private Partnership</option>
              <option value="Departmental Budget">Departmental Budget</option>
              <option value="External Donor">External Donor</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Attachments</label>
            <div
              className={`rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-gold bg-gold/10"
                  : "border-border bg-muted/30 hover:border-gold/50 hover:bg-muted/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.mov"
                onChange={(e) => {
                  if (e.target.files) void handleFileUpload(e.target.files);
                }}
              />
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-gold animate-spin mx-auto mb-2" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              )}
              <p className="text-sm text-muted-foreground">
                {isUploading ? "Uploading..." : "Drag & drop files or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Images, Videos, Documents (max 25MB each)</p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.url}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <FileText className="h-4 w-4 text-info shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">{file.originalName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.originalName}`}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); removeUploadedFile(file.url); }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Links */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">External Links</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-gold/50 placeholder:text-muted-foreground"
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleAddExternalLink}>
                Add
              </Button>
            </div>
            {externalLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {externalLinks.map((link) => (
                  <span key={link} className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2.5 py-1 text-xs text-info">
                    {link}
                    <button
                      type="button"
                      aria-label={`Remove link ${link}`}
                      title="Remove link"
                      onClick={() => setExternalLinks((prev) => prev.filter((item) => item !== link))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gold text-navy-dark hover:bg-gold-dark font-semibold">
              {isSubmitting ? "Submitting..." : "Submit Innovation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectForm;
