import { useState } from "react";
import { Filter, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterPanelProps {
  selectedCategories: string[];
  selectedDistricts: string[];
  categories: string[];
  districts: string[];
  onCategoriesChange: (cats: string[]) => void;
  onDistrictsChange: (dists: string[]) => void;
  onRunFilters: () => void;
}

const FilterPanel = ({
  selectedCategories,
  selectedDistricts,
  categories,
  districts,
  onCategoriesChange,
  onDistrictsChange,
  onRunFilters,
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
          type="button"
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
          <div className="px-4 pb-4 space-y-2">
            {categories.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2 text-xs text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                {cat}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Districts */}
      <div className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
        <button
          type="button"
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
          <div className="px-4 pb-4 space-y-3">
            <div className="max-h-40 overflow-y-auto rounded-lg border border-input bg-background px-3 py-2 space-y-1.5">
              {districts.map((dist) => (
                <label key={dist} className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedDistricts.includes(dist)}
                    onChange={() => toggleDistrict(dist)}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  {dist}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedDistricts.map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => toggleDistrict(dist)}
                  className="rounded-full bg-info/10 px-2 py-0.5 text-[11px] text-info"
                >
                  {dist}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        type="button"
        className="w-full bg-gold text-navy-dark hover:bg-gold-dark font-semibold"
        onClick={onRunFilters}
      >
        Run Filters
      </Button>
    </div>
  );
};

export default FilterPanel;
