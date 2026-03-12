import { useState } from "react";
import { CATEGORIES, DISTRICTS } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Link as LinkIcon, X } from "lucide-react";

interface CreateProjectFormProps {
  onBack: () => void;
  onSubmit: () => void;
}

const CreateProjectForm = ({ onBack, onSubmit }: CreateProjectFormProps) => {
  const [title, setTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [district, setDistrict] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [budget, setBudget] = useState("");
  const [externalLink, setExternalLink] = useState("");

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
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

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Attachments</label>
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop files or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Images, Videos, Documents</p>
            </div>
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
              <Button type="button" variant="outline" size="sm" className="shrink-0">
                Add
              </Button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gold text-navy-dark hover:bg-gold-dark font-semibold">
              Submit Innovation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectForm;
