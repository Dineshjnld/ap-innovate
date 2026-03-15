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
    <div className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Filters</span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        {/* ── Categories column ──────────────────────────────── */}
        <div className="px-2.5 py-2 bg-amber-50/60 dark:bg-amber-950/20">
          <button
            type="button"
            onClick={() => setCatExpanded(!catExpanded)}
            className="flex w-full items-center justify-between mb-1.5"
          >
            <div className="flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Categories</span>
            </div>
            <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">{catExpanded ? "▾" : "▸"}</span>
          </button>

          {catExpanded && (
            <div className="space-y-0.5">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 pb-1 mb-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allCatsSelected}
                  onChange={toggleSelectAllCategories}
                  className="h-3 w-3 rounded border-amber-300 accent-amber-500"
                />
                All
              </label>

              <div className="space-y-0.5">
                {categories.map((cat) => (
                  <label
                    key={cat}
                    className={`flex items-center gap-1.5 text-[10px] cursor-pointer leading-tight rounded px-1 py-0.5 transition-colors ${
                      selectedCategories.includes(cat)
                        ? "bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium"
                        : "text-foreground hover:bg-amber-100/50 dark:hover:bg-amber-900/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="h-3 w-3 rounded border-amber-300 accent-amber-500 shrink-0"
                    />
                    <span className="truncate">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Districts column ──────────────────────────────── */}
        <div className="px-2.5 py-2 bg-sky-50/60 dark:bg-sky-950/20">
          <button
            type="button"
            onClick={() => setDistExpanded(!distExpanded)}
            className="flex w-full items-center justify-between mb-1.5"
          >
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-sky-600 dark:text-sky-400" />
              <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300">Districts</span>
            </div>
            <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70">{distExpanded ? "▾" : "▸"}</span>
          </button>

          {distExpanded && (
            <div className="space-y-0.5">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 border-b border-sky-200 dark:border-sky-800 pb-1 mb-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allDistsSelected}
                  onChange={toggleSelectAllDistricts}
                  className="h-3 w-3 rounded border-sky-300 accent-sky-500"
                />
                All
              </label>

              <div className="space-y-0.5">
                {districts.map((dist) => (
                  <label
                    key={dist}
                    className={`flex items-center gap-1.5 text-[10px] cursor-pointer leading-tight rounded px-1 py-0.5 transition-colors ${
                      selectedDistricts.includes(dist)
                        ? "bg-sky-200/60 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 font-medium"
                        : "text-foreground hover:bg-sky-100/50 dark:hover:bg-sky-900/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDistricts.includes(dist)}
                      onChange={() => toggleDistrict(dist)}
                      className="h-3 w-3 rounded border-sky-300 accent-sky-500 shrink-0"
                    />
                    <span className="truncate">{dist}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
