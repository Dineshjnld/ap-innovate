import { useState } from "react";
import { Filter, MapPin, Tag } from "lucide-react";

interface FilterPanelProps {
  selectedCategories: string[];
  selectedDistricts: string[];
  categories: string[];
  districts: string[];
  onCategoriesChange: (cats: string[]) => void;
  onDistrictsChange: (dists: string[]) => void;
}

const FilterPanel = ({
  selectedCategories,
  selectedDistricts,
  categories,
  districts,
  onCategoriesChange,
  onDistrictsChange,
}: FilterPanelProps) => {
  const [catExpanded, setCatExpanded] = useState(true);
  const [distExpanded, setDistExpanded] = useState(true);

  // ── Category helpers ──────────────────────────────────────────────
  const allCatsSelected =
    categories.length > 0 && categories.every((c) => selectedCategories.includes(c));

  const toggleSelectAllCategories = () => {
    if (allCatsSelected) {
      onCategoriesChange([]);
    } else {
      onCategoriesChange([...categories]);
    }
  };

  const toggleCategory = (cat: string) => {
    onCategoriesChange(
      selectedCategories.includes(cat)
        ? selectedCategories.filter((c) => c !== cat)
        : [...selectedCategories, cat]
    );
  };

  // ── District helpers ──────────────────────────────────────────────
  const allDistsSelected =
    districts.length > 0 && districts.every((d) => selectedDistricts.includes(d));

  const toggleSelectAllDistricts = () => {
    if (allDistsSelected) {
      onDistrictsChange([]);
    } else {
      onDistrictsChange([...districts]);
    }
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
      {/* ── Innovation Categories ─────────────────────────────── */}
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
            {/* Select All */}
            <label className="flex items-center gap-2 text-xs font-semibold text-gold-dark border-b border-border pb-2 mb-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allCatsSelected}
                onChange={toggleSelectAllCategories}
                className="h-3.5 w-3.5 rounded border-border accent-amber-500"
              />
              Select All
            </label>

            {categories.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
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

      {/* ── Districts ─────────────────────────────────────────── */}
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
            {/* Select All */}
            <label className="flex items-center gap-2 text-xs font-semibold text-info border-b border-border pb-2 mb-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allDistsSelected}
                onChange={toggleSelectAllDistricts}
                className="h-3.5 w-3.5 rounded border-border accent-sky-500"
              />
              Select All
            </label>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-input bg-background px-3 py-2 space-y-1.5">
              {districts.map((dist) => (
                <label key={dist} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
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

            {/* Selected district pills */}
            {selectedDistricts.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedDistricts.map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => toggleDistrict(dist)}
                    className="rounded-full bg-info/10 px-2 py-0.5 text-[11px] text-info"
                  >
                    {dist} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;
