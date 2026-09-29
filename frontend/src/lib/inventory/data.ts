// Static data loader. The frontend is a client-side SPA with no backend, so
// pipeline output is bundled as JSON at build time (src/data/, written by
// ../../../src/export_json.py) and imported directly -- no fetch, no
// loading spinner needed for data that's already in the bundle.

import summaryJson from "@/data/summary.json";
import sensitivityJson from "@/data/sensitivity.json";
import policyJson from "@/data/policy.json";
import alertsJson from "@/data/alerts.json";
import simulationResultsJson from "@/data/simulation_results.json";
import abcJson from "@/data/abc.json";
import variabilityJson from "@/data/variability.json";
import segmentationJson from "@/data/segmentation.json";
import forecastAccuracyJson from "@/data/forecast_accuracy.json";
import forecastVsActualJson from "@/data/forecast_vs_actual.json";
import geographyJson from "@/data/geography.json";
import skuDimJson from "@/data/sku_dim.json";
import executiveSummaryJson from "@/data/executive_summary.md.json";

import type {
  SimulationSummary,
  SensitivityPoint,
  PolicyRow,
  AlertRow,
  SimulationResultRow,
  AbcRow,
  VariabilityRow,
  Segmentation,
  ForecastAccuracyRow,
  ForecastVsActual,
  GeographyRow,
  SkuDimRow,
} from "@/types/inventory";

export const summary = summaryJson as SimulationSummary;
export const sensitivity = sensitivityJson as SensitivityPoint[];
export const policy = policyJson as PolicyRow[];
export const alerts = alertsJson as AlertRow[];
export const simulationResults = simulationResultsJson as SimulationResultRow[];
export const abc = abcJson as AbcRow[];
export const variability = variabilityJson as VariabilityRow[];
export const segmentation = segmentationJson as Segmentation;
export const forecastAccuracy = forecastAccuracyJson as ForecastAccuracyRow[];
export const forecastVsActual = forecastVsActualJson as ForecastVsActual;
export const geography = geographyJson as GeographyRow[];
export const skuDim = skuDimJson as SkuDimRow[];
export const executiveSummary = executiveSummaryJson as string;

export const categories = Array.from(new Set(policy.map((p) => p.category))).sort();
export const markets = Array.from(new Set(policy.map((p) => p.market))).sort();
export const abcClasses: Array<"A" | "B" | "C"> = ["A", "B", "C"];

export interface Filters {
  categories: string[];
  markets: string[];
  abcClasses: string[];
}

export const defaultFilters = (): Filters => ({
  categories: [...categories],
  markets: [...markets],
  abcClasses: [...abcClasses],
});

function matchesFilters(
  row: { category?: string; market?: string; abc_class?: string },
  filters: Filters,
): boolean {
  if (row.category && filters.categories.length && !filters.categories.includes(row.category)) {
    return false;
  }
  if (row.market && filters.markets.length && !filters.markets.includes(row.market)) {
    return false;
  }
  if (row.abc_class && filters.abcClasses.length && !filters.abcClasses.includes(row.abc_class)) {
    return false;
  }
  return true;
}

export function filterPolicy(filters: Filters): PolicyRow[] {
  return policy.filter((r) => matchesFilters(r, filters));
}

export function filterAlerts(filters: Filters): AlertRow[] {
  return alerts.filter((r) => matchesFilters(r, filters));
}

export function filterSimulationResults(filters: Filters): SimulationResultRow[] {
  return simulationResults.filter((r) => matchesFilters(r, filters));
}

export function isFiltered(filters: Filters): boolean {
  return (
    filters.categories.length < categories.length ||
    filters.markets.length < markets.length ||
    filters.abcClasses.length < abcClasses.length
  );
}
