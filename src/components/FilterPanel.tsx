import { useState } from "react";
import { CATEGORIES, DISTRICTS } from "@/data/mockData";
import { Filter, MapPin, Tag } from "lucide-react";

interface FilterPanelProps {
  selectedCategories: string[];
  selectedDistricts: string[];
  onCategoriesChange: (cats: string[]) => void;
  onDistrictsChange: (dists: string[]) => void;
}

const FilterPanel = ({
  selectedCategories,
  selectedDistricts,
  onCategoriesChange,
  onDistrictsChange,
}: FilterPanelProps) => {
  const [catExpanded, setCatExpanded] = useState(true);
  const [distExpanded, setDistExpanded] = useState(true);

  const toggleCategory = (cat: string) => {
    onCategoriesChange(
      selectedCategories.includes(cat)
        ? selectedCategories.filter((c) => c !== cat)
        : [...selectedCategories, cat]
    );
  };

  const toggleDistrict = (dist: string) => {
    onDistrictsChange(
      selectedDistricts.includes(dist)
        ? selectedDistricts.filter((d) => d !== dist)
        : [...selectedDistricts, dist]
    );
  };

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
        <button
          onClick={() => setCatExpanded(!catExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-gold-dark" />
            <span className="text-sm font-semibold text-foreground">Innovation Categories</span>
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </button>
        {catExpanded && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  selectedCategories.includes(cat)
                    ? "bg-gold text-navy-dark shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Districts */}
      <div className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
        <button
          onClick={() => setDistExpanded(!distExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-info" />
            <span className="text-sm font-semibold text-foreground">Districts</span>
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </button>
        {distExpanded && (
          <div className="px-4 pb-3 max-h-48 overflow-y-auto space-y-1">
            {DISTRICTS.map((dist) => (
              <button
                key={dist}
                onClick={() => toggleDistrict(dist)}
                className={`flex w-full items-center rounded-md px-3 py-1.5 text-xs transition-all ${
                  selectedDistricts.includes(dist)
                    ? "bg-info/10 text-info font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {dist}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;
