import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Filter,
  ChevronDown,
  X,
  RotateCcw,
} from "lucide-react";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import { policy } from "@/lib/inventory/data";

export function InventoryFilterBar() {
  const {
    filters,
    setCategories,
    setMarkets,
    setAbcClasses,
    reset,
    isFiltered,
    allCategories,
    allMarkets,
    allAbcClasses,
  } = useInventoryFilters();

  const visibleSkuCount = policy.filter(
    (p) =>
      filters.categories.includes(p.category) &&
      filters.markets.includes(p.market) &&
      filters.abcClasses.includes(p.abc_class)
  ).length;

  // Active filter chips calculation
  const isCategoryFiltered = filters.categories.length < allCategories.length;
  const isMarketFiltered = filters.markets.length < allMarkets.length;
  const isAbcFiltered = filters.abcClasses.length < allAbcClasses.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 backdrop-blur-md p-3.5 shadow-sm transition-all">
      {/* Primary Filter Control Bar (Single Row) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Filter Dropdown Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground pr-1">
            <Filter className="size-4 text-primary" />
            <span>Filter By:</span>
          </div>

          {/* Category Filter Dropdown */}
          <FilterDropdown
            label="Category"
            options={allCategories}
            selected={filters.categories}
            onChange={setCategories}
            isFiltered={isCategoryFiltered}
          />

          {/* Market Filter Dropdown */}
          <FilterDropdown
            label="Market Region"
            options={allMarkets}
            selected={filters.markets}
            onChange={setMarkets}
            isFiltered={isMarketFiltered}
          />

          {/* ABC Class Filter Dropdown */}
          <FilterDropdown
            label="ABC Class"
            options={allAbcClasses}
            selected={filters.abcClasses}
            onChange={setAbcClasses}
            isFiltered={isAbcFiltered}
            formatOption={(opt) => `Class ${opt}`}
          />
        </div>

        {/* Right Side: SKU Counter & Reset Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Active Coverage:</span>
            <Badge variant="secondary" className="font-mono font-bold text-xs">
              {visibleSkuCount} / {policy.length} SKUs
            </Badge>
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
            >
              <RotateCcw className="size-3" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Row (Visible only when filters are active) */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">Applied Filters:</span>

          {/* Category Chips */}
          {isCategoryFiltered &&
            filters.categories.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className="h-6 text-[11px] gap-1 px-2 border-border/80 bg-background text-foreground font-medium hover:bg-muted cursor-pointer"
                onClick={() => {
                  const next = filters.categories.filter((c) => c !== cat);
                  setCategories(next.length ? next : allCategories);
                }}
              >
                <span>Category: {cat}</span>
                <X className="size-3 text-muted-foreground hover:text-foreground" />
              </Badge>
            ))}

          {/* Market Chips */}
          {isMarketFiltered &&
            filters.markets.map((mkt) => (
              <Badge
                key={mkt}
                variant="outline"
                className="h-6 text-[11px] gap-1 px-2 border-border/80 bg-background text-foreground font-medium hover:bg-muted cursor-pointer"
                onClick={() => {
                  const next = filters.markets.filter((m) => m !== mkt);
                  setMarkets(next.length ? next : allMarkets);
                }}
              >
                <span>Market: {mkt}</span>
                <X className="size-3 text-muted-foreground hover:text-foreground" />
              </Badge>
            ))}

          {/* ABC Class Chips */}
          {isAbcFiltered &&
            filters.abcClasses.map((cls) => (
              <Badge
                key={cls}
                variant="outline"
                className="h-6 text-[11px] gap-1 px-2 border-border/80 bg-background text-foreground font-medium hover:bg-muted cursor-pointer"
                onClick={() => {
                  const next = filters.abcClasses.filter((c) => c !== cls);
                  setAbcClasses(next.length ? next : allAbcClasses);
                }}
              >
                <span>Class {cls}</span>
                <X className="size-3 text-muted-foreground hover:text-foreground" />
              </Badge>
            ))}

          <Button
            variant="link"
            size="sm"
            onClick={reset}
            className="h-6 text-[11px] text-primary p-0 ml-1 font-semibold hover:underline"
          >
            Reset all
          </Button>
        </div>
      )}
    </div>
  );
}

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isFiltered: boolean;
  formatOption?: (opt: string) => string;
}

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  isFiltered,
  formatOption = (opt) => opt,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const isAllSelected = selected.length === options.length;

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      if (selected.length === 1) {
        onChange(options); // Reset to all if unchecking the last item
      } else {
        onChange(selected.filter((item) => item !== opt));
      }
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    onChange(options);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`h-8 text-xs px-3 gap-2 border font-medium transition-all inline-flex items-center justify-center rounded-lg cursor-pointer ${
          isFiltered
            ? "border-primary text-primary bg-primary/5 font-semibold shadow-xs"
            : "border-border/80 bg-background text-foreground hover:bg-muted"
        }`}
      >
        <span>{label}</span>
        <Badge
          variant={isFiltered ? "default" : "secondary"}
          className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold"
        >
          {isAllSelected ? "All" : `${selected.length}`}
        </Badge>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-2 rounded-xl shadow-xl border border-border/80 bg-popover">
        <div className="flex flex-col gap-1">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50 text-xs">
            <span className="font-bold text-foreground">{label}</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              {isAllSelected ? "Select All" : "Reset"}
            </button>
          </div>

          {/* Options List */}
          <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto py-1">
            {options.map((opt) => {
              const isChecked = selected.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/80 cursor-pointer text-xs font-medium text-foreground transition-colors"
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleOption(opt)} />
                  <span className="flex-1 truncate">{formatOption(opt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
