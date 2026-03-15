import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

interface MultiSelectDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  accentColor?: string;
}

const MultiSelectDropdown = ({
  label,
  icon,
  options,
  selected,
  onChange,
  accentColor = "text-foreground",
}: MultiSelectDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allSelected = options.length > 0 && options.every((o) => selected.includes(o));
  const noneSelected = selected.length === 0;
  const someSelected = !allSelected && !noneSelected;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleAll = () => {
    onChange(allSelected ? [] : [...options]);
  };

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option],
    );
  };

  const summaryText = allSelected
    ? "All Selected"
    : noneSelected
      ? "None"
      : selected.length <= 2
        ? selected.join(", ")
        : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm hover:bg-muted/50 transition-colors"
      >
        {icon && <span className={`shrink-0 ${accentColor}`}>{icon}</span>}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
            {label}
          </span>
          <span className="text-xs text-foreground truncate">{summaryText}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-lg max-h-[300px] overflow-y-auto [scrollbar-width:thin]">
          {/* Select All */}
          <button
            type="button"
            onClick={toggleAll}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold border-b border-border hover:bg-muted/50 transition-colors"
          >
            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${allSelected ? "bg-primary border-primary" : someSelected ? "bg-primary/30 border-primary" : "border-border"}`}>
              {(allSelected || someSelected) && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            <span className={accentColor}>Select All</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{selected.length}/{options.length}</span>
          </button>

          {/* Options */}
          {options.map((option) => {
            const isChecked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
              >
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isChecked ? "bg-primary border-primary" : "border-border"}`}>
                  {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="truncate text-foreground">{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
