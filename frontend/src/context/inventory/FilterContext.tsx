import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { categories, markets, abcClasses, defaultFilters, type Filters } from "@/lib/inventory/data";

interface FilterContextValue {
  filters: Filters;
  setCategories: (v: string[]) => void;
  setMarkets: (v: string[]) => void;
  setAbcClasses: (v: string[]) => void;
  reset: () => void;
  isFiltered: boolean;
  allCategories: string[];
  allMarkets: string[];
  allAbcClasses: string[];
}

const FilterContext = createContext<FilterContextValue | null>(null);

/**
 * Shared filter state across every inventory view (Category / Market / ABC
 * class) via React context so all views stay in sync without prop drilling.
 * Lives at the layout level so navigating between views preserves the
 * current filter selection.
 */
export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(markets);
  const [selectedAbcClasses, setSelectedAbcClasses] = useState<string[]>(abcClasses);

  const filters: Filters = useMemo(
    () => ({
      categories: selectedCategories,
      markets: selectedMarkets,
      abcClasses: selectedAbcClasses,
    }),
    [selectedCategories, selectedMarkets, selectedAbcClasses],
  );

  const value: FilterContextValue = {
    filters,
    setCategories: setSelectedCategories,
    setMarkets: setSelectedMarkets,
    setAbcClasses: setSelectedAbcClasses,
    reset: () => {
      const d = defaultFilters();
      setSelectedCategories(d.categories);
      setSelectedMarkets(d.markets);
      setSelectedAbcClasses(d.abcClasses);
    },
    isFiltered:
      selectedCategories.length < categories.length ||
      selectedMarkets.length < markets.length ||
      selectedAbcClasses.length < abcClasses.length,
    allCategories: categories,
    allMarkets: markets,
    allAbcClasses: abcClasses,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useInventoryFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error("useInventoryFilters must be used within a FilterProvider");
  }
  return ctx;
}
