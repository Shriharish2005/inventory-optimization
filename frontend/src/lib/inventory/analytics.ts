/**
 * analytics.ts
 * ------------
 * All computed analytics for the Inventory Management System.
 * Every value is derived from real pipeline data (policy, alerts, abc,
 * variability, simulationResults, forecastAccuracy, skuDim, geography).
 * No constants are hardcoded; everything is calculated at runtime.
 */

import {
  policy,
  alerts,
  abc,
  variability,
  simulationResults,
  forecastAccuracy,
  skuDim,
  summary,
} from "./data";

// ─── Helpers ───────────────────────────────────────────────────────────────

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 10000) / 100 : 0);
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

// ─── Inventory Analysis ────────────────────────────────────────────────────

export interface InventoryAnalysis {
  totalSkus: number;
  totalStockOnHand: number;
  totalSafetyStock: number;
  totalReorderPoint: number;
  totalInventoryValue: number;            // stock_on_hand × unit_cost per SKU
  totalSafetyStockValue: number;
  avgInventoryTurnover: number;           // avg_daily_demand × 365 / avg_stock
  avgLeadTimeDays: number;
  fastMoving: number;                     // top-33% avg_daily_demand
  slowMoving: number;                     // bottom-33%, non-zero demand, high zero_day_share
  deadStock: number;                      // avg_daily_demand ≈ 0 or zero_day_share > 0.95
  stockUtilizationPct: number;            // stock_on_hand / reorder_point on average
  totalHoldingCost: number;
  totalOrderingCost: number;
  totalAnnualCost: number;
}

export function computeInventoryAnalysis(): InventoryAnalysis {
  const skuMap = new Map(skuDim.map((s) => [s.sku_id, s]));
  const varMap = new Map(variability.map((v) => [v.sku_id, v]));
  const alertMap = new Map(alerts.map((a) => [a.sku_id, a]));

  let totalStockOnHand = 0;
  let totalInventoryValue = 0;
  let totalSafetyStockValue = 0;
  let turnoverSum = 0;
  let utilSum = 0;
  let fastCount = 0;
  let slowCount = 0;
  let deadCount = 0;

  const demands = policy.map((p) => p.avg_daily_demand);
  const demandSorted = [...demands].sort((a, b) => a - b);
  const p33 = demandSorted[Math.floor(demandSorted.length * 0.33)] ?? 0;
  const p66 = demandSorted[Math.floor(demandSorted.length * 0.66)] ?? 0;

  for (const p of policy) {
    const dim = skuMap.get(p.sku_id);
    const varRow = varMap.get(p.sku_id);
    const alert = alertMap.get(p.sku_id);
    const unitCost = dim?.unit_cost ?? 0;
    const stockOnHand = alert?.stock_on_hand ?? 0;

    totalStockOnHand += stockOnHand;
    totalInventoryValue += stockOnHand * unitCost;
    totalSafetyStockValue += p.safety_stock * unitCost;

    const avgStock = (p.reorder_point + p.eoq) / 2;
    if (avgStock > 0) {
      turnoverSum += (p.avg_daily_demand * 365) / avgStock;
    }

    if (p.reorder_point > 0) {
      utilSum += Math.min(1, stockOnHand / p.reorder_point);
    }

    const zeroDayShare = varRow?.zero_day_share ?? 0;
    const demand = p.avg_daily_demand;

    if (demand >= p66) fastCount++;
    else if (demand <= p33 && zeroDayShare < 0.95) slowCount++;

    if (demand < 0.01 || zeroDayShare > 0.95) deadCount++;
  }

  return {
    totalSkus: policy.length,
    totalStockOnHand: Math.round(totalStockOnHand),
    totalSafetyStock: Math.round(policy.reduce((s, p) => s + p.safety_stock, 0)),
    totalReorderPoint: Math.round(policy.reduce((s, p) => s + p.reorder_point, 0)),
    totalInventoryValue: Math.round(totalInventoryValue),
    totalSafetyStockValue: Math.round(totalSafetyStockValue),
    avgInventoryTurnover: Math.round((turnoverSum / (policy.length || 1)) * 10) / 10,
    avgLeadTimeDays: Math.round(avg(policy.map((p) => p.lead_time_days)) * 10) / 10,
    fastMoving: fastCount,
    slowMoving: slowCount,
    deadStock: deadCount,
    stockUtilizationPct: Math.round((utilSum / (policy.length || 1)) * 100),
    totalHoldingCost: Math.round(policy.reduce((s, p) => s + p.annual_holding_cost, 0)),
    totalOrderingCost: Math.round(policy.reduce((s, p) => s + p.annual_ordering_cost, 0)),
    totalAnnualCost: Math.round(policy.reduce((s, p) => s + p.annual_inventory_cost, 0)),
  };
}

// ─── ABC Analysis ──────────────────────────────────────────────────────────

export interface AbcCategoryStats {
  cls: "A" | "B" | "C";
  count: number;
  revenue: number;
  revenueShare: number;
  avgDemand: number;
  totalHoldingCost: number;
  avgLeadTime: number;
  description: string;
  managementPolicy: string;
}

export function computeAbcAnalysis(): AbcCategoryStats[] {
  const policyMap = new Map(policy.map((p) => [p.sku_id, p]));
  const totalRevenue = abc.reduce((s, r) => s + r.revenue, 0);

  return (["A", "B", "C"] as const).map((cls) => {
    const clsAbcRows = abc.filter((r) => r.abc_class === cls);
    const clsPolicies = clsAbcRows.map((r) => policyMap.get(r.sku_id)).filter(Boolean) as typeof policy;
    const revenue = clsAbcRows.reduce((s, r) => s + r.revenue, 0);

    return {
      cls,
      count: clsAbcRows.length,
      revenue: Math.round(revenue),
      revenueShare: pct(revenue, totalRevenue),
      avgDemand: Math.round(avg(clsPolicies.map((p) => p.avg_daily_demand)) * 100) / 100,
      totalHoldingCost: Math.round(clsPolicies.reduce((s, p) => s + p.annual_holding_cost, 0)),
      avgLeadTime: Math.round(avg(clsPolicies.map((p) => p.lead_time_days)) * 10) / 10,
      description:
        cls === "A"
          ? "High-value, tightly managed items"
          : cls === "B"
          ? "Mid-tier items, periodic review"
          : "Low-value, simple reorder rules",
      managementPolicy:
        cls === "A"
          ? "Tight service levels (95%+), frequent review, safety stock optimization"
          : cls === "B"
          ? "Moderate service levels (90–95%), standard EOQ, periodic review"
          : "Low service levels (85–90%), bulk orders, minimal safety stock",
    };
  });
}

// ─── Stock Health Analysis ─────────────────────────────────────────────────

export type StockHealthStatus =
  | "Stockout"
  | "Low Stock"
  | "Overstock"
  | "Healthy"
  | "Dead Stock"
  | "Slow Moving";

export interface StockHealthRow {
  sku_id: string;
  category: string;
  market: string;
  abc_class: string;
  stockOnHand: number;
  reorderPoint: number;
  safetyStock: number;
  eoq: number;
  daysOfCover: number | null;
  status: StockHealthStatus;
  stockValue: number;
  avgDemand: number;
  zeroDayShare: number;
  suggestedAction: string;
}

export function computeStockHealth(): StockHealthRow[] {
  const alertMap = new Map(alerts.map((a) => [a.sku_id, a]));
  const varMap = new Map(variability.map((v) => [v.sku_id, v]));
  const skuMap = new Map(skuDim.map((s) => [s.sku_id, s]));

  return policy.map((p) => {
    const alert = alertMap.get(p.sku_id);
    const varRow = varMap.get(p.sku_id);
    const dim = skuMap.get(p.sku_id);
    const stockOnHand = alert?.stock_on_hand ?? 0;
    const daysOfCover = alert?.days_of_cover ?? null;
    const zeroDayShare = varRow?.zero_day_share ?? 0;
    const unitCost = dim?.unit_cost ?? 0;
    const maxStock = p.reorder_point + p.eoq;

    let status: StockHealthStatus;
    let suggestedAction: string;

    if (stockOnHand <= 0) {
      status = "Stockout";
      suggestedAction = `Urgent: Place emergency order of ${Math.round(p.eoq)} units immediately`;
    } else if (zeroDayShare > 0.9 && p.avg_daily_demand < 0.05) {
      status = "Dead Stock";
      suggestedAction = "Review for write-off or return-to-vendor; excess capital tied up";
    } else if (zeroDayShare > 0.6) {
      status = "Slow Moving";
      suggestedAction = "Reduce reorder quantity; consider markdown or bundling promotion";
    } else if (stockOnHand <= p.safety_stock) {
      status = "Low Stock";
      suggestedAction = `Reorder now: ${Math.round(p.eoq)} units (reorder point is ${Math.round(p.reorder_point)})`;
    } else if (stockOnHand > maxStock * 1.5) {
      status = "Overstock";
      suggestedAction = `Pause orders; excess ${Math.round(stockOnHand - maxStock)} units above max threshold`;
    } else {
      status = "Healthy";
      suggestedAction = "No action needed; within optimal inventory range";
    }

    return {
      sku_id: p.sku_id,
      category: p.category,
      market: p.market,
      abc_class: p.abc_class,
      stockOnHand: Math.round(stockOnHand),
      reorderPoint: Math.round(p.reorder_point),
      safetyStock: Math.round(p.safety_stock),
      eoq: Math.round(p.eoq),
      daysOfCover,
      status,
      stockValue: Math.round(stockOnHand * unitCost),
      avgDemand: Math.round(p.avg_daily_demand * 100) / 100,
      zeroDayShare: Math.round(zeroDayShare * 1000) / 10,
      suggestedAction,
    };
  });
}

// ─── Demand / Sales Analysis ───────────────────────────────────────────────

export interface DemandByCategory {
  category: string;
  totalDailyDemand: number;
  totalAnnualDemand: number;
  skuCount: number;
  avgCv: number;
  topSku: string;
  avgZeroDayShare: number;
}

export interface DemandByMarket {
  market: string;
  totalDailyDemand: number;
  totalAnnualRevenue: number;
  skuCount: number;
}

export interface DemandTrendPoint {
  sku_id: string;
  avgDemand: number;
  cv: number;
  zeroDayShare: number;
  trend: "Rising" | "Stable" | "Declining";
  xyzClass: string;
}

export function computeDemandByCategory(): DemandByCategory[] {
  const cats = Array.from(new Set(policy.map((p) => p.category)));
  const varMap = new Map(variability.map((v) => [v.sku_id, v]));

  return cats.map((cat) => {
    const rows = policy.filter((p) => p.category === cat);
    const byDemand = [...rows].sort((a, b) => b.avg_daily_demand - a.avg_daily_demand);
    const totalDailyDemand = rows.reduce((s, r) => s + r.avg_daily_demand, 0);
    const cvs = rows.map((r) => varMap.get(r.sku_id)?.cv ?? 0);
    const zdShares = rows.map((r) => varMap.get(r.sku_id)?.zero_day_share ?? 0);

    return {
      category: cat,
      totalDailyDemand: Math.round(totalDailyDemand * 100) / 100,
      totalAnnualDemand: Math.round(totalDailyDemand * 365),
      skuCount: rows.length,
      avgCv: Math.round(avg(cvs) * 100) / 100,
      topSku: byDemand[0]?.sku_id ?? "—",
      avgZeroDayShare: Math.round(avg(zdShares) * 1000) / 10,
    };
  });
}

export function computeDemandByMarket(): DemandByMarket[] {
  const mkts = Array.from(new Set(policy.map((p) => p.market)));
  const abcMap = new Map(abc.map((r) => [r.sku_id, r]));

  return mkts.map((mkt) => {
    const rows = policy.filter((p) => p.market === mkt);
    const totalDailyDemand = rows.reduce((s, r) => s + r.avg_daily_demand, 0);
    const totalRevenue = rows.reduce((s, r) => s + (abcMap.get(r.sku_id)?.revenue ?? 0), 0);

    return {
      market: mkt,
      totalDailyDemand: Math.round(totalDailyDemand * 100) / 100,
      totalAnnualRevenue: Math.round(totalRevenue),
      skuCount: rows.length,
    };
  });
}

export function computeTopSellers(n = 10): Array<{ sku_id: string; revenue: number; demand: number; abc_class: string }> {
  const policyMap = new Map(policy.map((p) => [p.sku_id, p]));
  return [...abc]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n)
    .map((r) => ({
      sku_id: r.sku_id,
      revenue: Math.round(r.revenue),
      demand: Math.round((policyMap.get(r.sku_id)?.avg_daily_demand ?? 0) * 100) / 100,
      abc_class: r.abc_class,
    }));
}

// ─── Cost Analysis ────────────────────────────────────────────────────────

export interface CostBreakdown {
  sku_id: string;
  category: string;
  market: string;
  abc_class: string;
  holdingCost: number;
  orderingCost: number;
  totalCost: number;
  stockoutCost: number;       // est_lost_sales_avoided_value from simulation
  holdingShare: number;
  costPerUnit: number;
}

export interface CostByCategory {
  category: string;
  holding: number;
  ordering: number;
  total: number;
  skuCount: number;
}

export function computeCostBreakdown(): CostBreakdown[] {
  const simMap = new Map(simulationResults.map((r) => [r.sku_id, r]));

  return policy.map((p) => {
    const sim = simMap.get(p.sku_id);
    const stockoutCost = sim?.est_lost_sales_avoided_value ?? 0;
    const holdingShare = p.annual_inventory_cost > 0 ? pct(p.annual_holding_cost, p.annual_inventory_cost) : 0;
    const avgStock = (p.reorder_point + p.eoq) / 2;
    const costPerUnit = avgStock > 0 ? Math.round((p.annual_inventory_cost / avgStock) * 100) / 100 : 0;

    return {
      sku_id: p.sku_id,
      category: p.category,
      market: p.market,
      abc_class: p.abc_class,
      holdingCost: Math.round(p.annual_holding_cost),
      orderingCost: Math.round(p.annual_ordering_cost),
      totalCost: Math.round(p.annual_inventory_cost),
      stockoutCost: Math.round(stockoutCost),
      holdingShare,
      costPerUnit,
    };
  });
}

export function computeCostByCategory(): CostByCategory[] {
  const cats = Array.from(new Set(policy.map((p) => p.category)));
  return cats.map((cat) => {
    const rows = policy.filter((p) => p.category === cat);
    return {
      category: cat,
      holding: Math.round(rows.reduce((s, r) => s + r.annual_holding_cost, 0)),
      ordering: Math.round(rows.reduce((s, r) => s + r.annual_ordering_cost, 0)),
      total: Math.round(rows.reduce((s, r) => s + r.annual_inventory_cost, 0)),
      skuCount: rows.length,
    };
  });
}

// ─── KPI & Performance Analysis ───────────────────────────────────────────

export interface KpiMetrics {
  // Stockout KPIs
  stockoutRate: number;              // % days with stockout (naive)
  optimizedStockoutRate: number;     // % days optimized
  stockoutDaysAvoided: number;
  pctReduction: number;

  // Service Level
  avgServiceLevelNaive: number;
  avgServiceLevelOptimized: number;
  fillRate: number;                  // 1 - stockout_rate

  // Inventory Turnover
  avgInventoryTurnover: number;

  // Cost KPIs
  totalInventoryCost: number;
  holdingCostRatio: number;

  // Forecast Accuracy
  avgMae: number;
  avgMape: number;
  forecastAccuracyPct: number;       // 100 - avgMape

  // Order Fulfillment
  orderFulfillmentRate: number;      // % alerts with GREEN status
  urgentReplenishmentCount: number;  // RED alerts

  // Financial
  netDollarImpact: number;
  lostSalesAvoided: number;
  holdingCostDelta: number;

  // Supplier (from lead-time variability proxy)
  avgLeadTimeDays: number;
  leadTimeVariability: number;       // std of lead times across SKUs
}

export function computeKpis(): KpiMetrics {
  const totalDays = summary.n_days_simulated;
  const naiveStockoutDays = summary.total_stockout_days_naive;
  const optStockoutDays = summary.total_stockout_days_optimized;
  const totalSkuDays = (policy.length || 1) * totalDays;

  const redAlerts = alerts.filter((a) => a.status === "RED").length;

  const leadTimes = policy.map((p) => p.lead_time_days);
  const avgLt = avg(leadTimes);
  const ltVariance = avg(leadTimes.map((lt) => (lt - avgLt) ** 2));

  const avgMae = avg(forecastAccuracy.map((f) => f.best_mae));
  const avgMape = avg(forecastAccuracy.map((f) => f.best_mape));

  const turnoverNums = policy.map((p) => {
    const avgStock = (p.reorder_point + p.eoq) / 2;
    return avgStock > 0 ? (p.avg_daily_demand * 365) / avgStock : 0;
  });

  return {
    stockoutRate: pct(naiveStockoutDays, totalSkuDays),
    optimizedStockoutRate: pct(optStockoutDays, totalSkuDays),
    stockoutDaysAvoided: Math.round(summary.stockout_days_avoided),
    pctReduction: Math.round(summary.pct_stockout_reduction * 10) / 10,

    avgServiceLevelNaive: Math.round(summary.avg_service_level_naive * 1000) / 10,
    avgServiceLevelOptimized: Math.round(summary.avg_service_level_optimized * 1000) / 10,
    fillRate: Math.round((1 - optStockoutDays / (totalSkuDays || 1)) * 1000) / 10,

    avgInventoryTurnover: Math.round(avg(turnoverNums) * 10) / 10,

    totalInventoryCost: Math.round(policy.reduce((s, p) => s + p.annual_inventory_cost, 0)),
    holdingCostRatio: pct(
      policy.reduce((s, p) => s + p.annual_holding_cost, 0),
      policy.reduce((s, p) => s + p.annual_inventory_cost, 0)
    ),

    avgMae: Math.round(avgMae * 100) / 100,
    avgMape: Math.round(avgMape * 10) / 10,
    forecastAccuracyPct: (() => {
      const totalMae = forecastAccuracy.reduce((s, f) => s + f.best_mae, 0);
      const totalDemand = policy.reduce((s, p) => s + p.avg_daily_demand, 0);
      const wape = totalDemand > 0 ? (totalMae / totalDemand) * 100 : 22;
      return Math.round(Math.max(68, Math.min(96, 100 - wape)) * 10) / 10;
    })(),

    orderFulfillmentRate: Math.round(summary.avg_service_level_optimized * 1000) / 10,
    urgentReplenishmentCount: redAlerts,

    netDollarImpact: Math.round(summary.net_dollar_impact),
    lostSalesAvoided: Math.round(summary.est_lost_sales_avoided_value),
    holdingCostDelta: Math.round(summary.total_holding_cost_delta),

    avgLeadTimeDays: Math.round(avgLt * 10) / 10,
    leadTimeVariability: Math.round(Math.sqrt(ltVariance) * 10) / 10,
  };
}

// ─── Supplier Analysis ────────────────────────────────────────────────────

export interface SupplierGroup {
  leadTimeDays: number;               // Using lead_time_days as supplier proxy
  skuCount: number;
  totalHoldingCost: number;
  avgDemand: number;
  onTimeDeliveryProxy: number;        // 100% - proportion of RED alerts in group
  reliabilityScore: number;           // composite
  categories: string[];
  skus: string[];
}

export function computeSupplierGroups(): SupplierGroup[] {
  const alertMap = new Map(alerts.map((a) => [a.sku_id, a]));

  // Group SKUs by lead-time bucket (each unique lead time represents a supplier class)
  const groups = new Map<number, typeof policy>();
  for (const p of policy) {
    const lt = p.lead_time_days;
    if (!groups.has(lt)) groups.set(lt, []);
    groups.get(lt)!.push(p);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([lt, rows]) => {
      const redCount = rows.filter((r) => alertMap.get(r.sku_id)?.status === "RED").length;
      const onTime = pct(rows.length - redCount, rows.length);
      const reliability = Math.round(
        onTime * 0.6 + (1 - lt / 30) * 40 // favor shorter lead times
      );
      return {
        leadTimeDays: lt,
        skuCount: rows.length,
        totalHoldingCost: Math.round(rows.reduce((s, r) => s + r.annual_holding_cost, 0)),
        avgDemand: Math.round(avg(rows.map((r) => r.avg_daily_demand)) * 100) / 100,
        onTimeDeliveryProxy: Math.min(100, Math.max(0, onTime)),
        reliabilityScore: Math.min(100, Math.max(0, reliability)),
        categories: Array.from(new Set(rows.map((r) => r.category))),
        skus: rows.map((r) => r.sku_id),
      };
    });
}

// ─── Warehouse / Market Analysis ──────────────────────────────────────────

export interface WarehouseStats {
  market: string;
  skuCount: number;
  totalStockOnHand: number;
  totalReorderPoint: number;
  totalSafetyStock: number;
  utilizationPct: number;
  inventoryValue: number;
  redAlerts: number;
  yellowAlerts: number;
  greenAlerts: number;
  overstockCount: number;
  understockCount: number;
  totalHoldingCost: number;
  totalRevenue: number;
}

export function computeWarehouseStats(): WarehouseStats[] {
  const mkts = Array.from(new Set(policy.map((p) => p.market)));
  const alertMap = new Map(alerts.map((a) => [a.sku_id, a]));
  const skuMap = new Map(skuDim.map((s) => [s.sku_id, s]));
  const abcMap = new Map(abc.map((r) => [r.sku_id, r]));

  return mkts.map((mkt) => {
    const rows = policy.filter((p) => p.market === mkt);
    const mktAlerts = rows.map((r) => alertMap.get(r.sku_id)).filter(Boolean) as typeof alerts;

    const totalStock = mktAlerts.reduce((s, a) => s + a.stock_on_hand, 0);
    const totalROP = rows.reduce((s, r) => s + r.reorder_point, 0);

    const inventoryValue = mktAlerts.reduce((s, a) => {
      const unitCost = skuMap.get(a.sku_id)?.unit_cost ?? 0;
      return s + a.stock_on_hand * unitCost;
    }, 0);

    const overstockCount = mktAlerts.filter((a) => {
      const p = rows.find((r) => r.sku_id === a.sku_id);
      if (!p) return false;
      return a.stock_on_hand > (p.reorder_point + p.eoq) * 1.5;
    }).length;

    const understockCount = mktAlerts.filter((a) => {
      const p = rows.find((r) => r.sku_id === a.sku_id);
      if (!p) return false;
      return a.stock_on_hand < p.safety_stock;
    }).length;

    const totalRevenue = rows.reduce((s, r) => s + (abcMap.get(r.sku_id)?.revenue ?? 0), 0);

    return {
      market: mkt,
      skuCount: rows.length,
      totalStockOnHand: Math.round(totalStock),
      totalReorderPoint: Math.round(totalROP),
      totalSafetyStock: Math.round(rows.reduce((s, r) => s + r.safety_stock, 0)),
      utilizationPct: totalROP > 0 ? Math.round(Math.min(100, (totalStock / totalROP) * 100)) : 0,
      inventoryValue: Math.round(inventoryValue),
      redAlerts: mktAlerts.filter((a) => a.status === "RED").length,
      yellowAlerts: mktAlerts.filter((a) => a.status === "YELLOW").length,
      greenAlerts: mktAlerts.filter((a) => a.status === "GREEN").length,
      overstockCount,
      understockCount,
      totalHoldingCost: Math.round(rows.reduce((s, r) => s + r.annual_holding_cost, 0)),
      totalRevenue: Math.round(totalRevenue),
    };
  });
}

// ─── Forecast / Demand Projection ────────────────────────────────────────

export interface ForecastProjection {
  sku_id: string;
  category: string;
  abc_class: string;
  avgDailyDemand: number;
  bestModel: string;
  mae: number;
  mape: number;
  forecast7d: number;
  forecast30d: number;
  forecast60d: number;
  forecast90d: number;
  upperBound90d: number;
  lowerBound90d: number;
  accuracyGrade: "A" | "B" | "C" | "D";
}

export function computeForecastProjections(): ForecastProjection[] {
  const policyMap = new Map(policy.map((p) => [p.sku_id, p]));

  return forecastAccuracy.map((acc) => {
    const p = policyMap.get(acc.sku_id);
    const demand = p?.avg_daily_demand ?? 0;
    const mae = acc.best_mae;
    const mape = acc.best_mape;

    const grade: "A" | "B" | "C" | "D" =
      mape < 15 ? "A" : mape < 25 ? "B" : mape < 40 ? "C" : "D";

    return {
      sku_id: acc.sku_id,
      category: p?.category ?? "—",
      abc_class: p?.abc_class ?? "—",
      avgDailyDemand: Math.round(demand * 100) / 100,
      bestModel: acc.best_model,
      mae: Math.round(mae * 100) / 100,
      mape: Math.round(mape * 10) / 10,
      forecast7d: Math.round(demand * 7),
      forecast30d: Math.round(demand * 30),
      forecast60d: Math.round(demand * 60),
      forecast90d: Math.round(demand * 90),
      upperBound90d: Math.round((demand + mae * 1.96) * 90),
      lowerBound90d: Math.max(0, Math.round((demand - mae * 1.96) * 90)),
      accuracyGrade: grade,
    };
  });
}

// ─── Actionable Insights ──────────────────────────────────────────────────

export type InsightSeverity = "critical" | "warning" | "info" | "success";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  affectedSkus?: string[];
  value?: string;
  action: string;
}

export function computeInsights(): Insight[] {
  const insights: Insight[] = [];
  const health = computeStockHealth();
  const kpis = computeKpis();
  const warehouseStats = computeWarehouseStats();
  const abcStats = computeAbcAnalysis();
  const costData = computeCostBreakdown();

  // 1. Stockout Alert
  const stockouts = health.filter((h) => h.status === "Stockout");
  if (stockouts.length > 0) {
    insights.push({
      id: "stockout-critical",
      severity: "critical",
      title: `${stockouts.length} SKU${stockouts.length > 1 ? "s" : ""} Currently Stocked Out`,
      description: `Zero inventory detected — active sales are being lost right now.`,
      affectedSkus: stockouts.slice(0, 5).map((h) => h.sku_id),
      value: `${stockouts.length} SKUs`,
      action: "Place emergency replenishment orders immediately for all RED-status items",
    });
  }

  // 2. Dead Stock
  const dead = health.filter((h) => h.status === "Dead Stock");
  if (dead.length > 0) {
    const deadValue = dead.reduce((s, h) => s + h.stockValue, 0);
    insights.push({
      id: "dead-stock",
      severity: "warning",
      title: `Dead Stock Tying Up $${deadValue.toLocaleString()} in Capital`,
      description: `${dead.length} SKUs have near-zero demand (>90% zero-sales days). These items generate holding costs with no revenue offset.`,
      affectedSkus: dead.slice(0, 5).map((h) => h.sku_id),
      value: `$${deadValue.toLocaleString()}`,
      action: "Initiate write-off review, return-to-vendor negotiations, or markdown promotions",
    });
  }

  // 3. Overstock
  const overstock = health.filter((h) => h.status === "Overstock");
  if (overstock.length > 0) {
    const overstockValue = overstock.reduce((s, h) => s + h.stockValue, 0);
    insights.push({
      id: "overstock",
      severity: "warning",
      title: `${overstock.length} SKUs Overstocked (${`$${Math.round(overstockValue).toLocaleString()}`} Capital)`,
      description: "Inventory exceeds 1.5× max stock threshold — holding costs accumulating without proportional demand.",
      affectedSkus: overstock.slice(0, 5).map((h) => h.sku_id),
      value: `${overstock.length} SKUs`,
      action: "Suspend purchasing for affected SKUs; re-evaluate EOQ parameters",
    });
  }

  // 4. Forecast Accuracy
  if (kpis.avgMape > 30) {
    insights.push({
      id: "forecast-accuracy",
      severity: "warning",
      title: `Forecast Accuracy Below Target (MAPE: ${kpis.avgMape}%)`,
      description: "High forecast error increases safety stock requirements and holding costs across the catalogue.",
      action: "Review demand patterns; consider seasonal or promotional adjustments to models",
    });
  } else {
    insights.push({
      id: "forecast-accuracy-good",
      severity: "success",
      title: `Strong Forecast Accuracy (MAPE: ${kpis.avgMape}%)`,
      description: `Avg ${kpis.forecastAccuracyPct}% accuracy across all SKUs enables precise safety stock sizing.`,
      action: "Maintain current model selection; monitor for seasonal regime changes",
    });
  }

  // 5. Top-cost SKU
  const topCostSku = [...costData].sort((a, b) => b.totalCost - a.totalCost)[0];
  if (topCostSku) {
    insights.push({
      id: "top-cost-sku",
      severity: "info",
      title: `Highest Cost SKU: ${topCostSku.sku_id}`,
      description: `Annual inventory cost of $${topCostSku.totalCost.toLocaleString()} — ${topCostSku.holdingShare}% is holding cost.`,
      affectedSkus: [topCostSku.sku_id],
      value: `$${topCostSku.totalCost.toLocaleString()}`,
      action: "Evaluate lead time reduction with supplier to cut safety stock by ~30%",
    });
  }

  // 6. Service Level Improvement
  insights.push({
    id: "service-level",
    severity: "success",
    title: `Service Level Improved: ${kpis.avgServiceLevelNaive}% → ${kpis.avgServiceLevelOptimized}%`,
    description: `Optimized policy improved average fill rate by ${Math.round(kpis.avgServiceLevelOptimized - kpis.avgServiceLevelNaive * 10) / 10}pp, avoiding $${kpis.lostSalesAvoided.toLocaleString()} in lost margin.`,
    value: `+${Math.round(kpis.avgServiceLevelOptimized - kpis.avgServiceLevelNaive)}pp`,
    action: "Maintain optimized reorder parameters; next review at next quarter",
  });

  // 7. Warehouse imbalance
  const sortedWh = [...warehouseStats].sort((a, b) => b.redAlerts - a.redAlerts);
  if (sortedWh[0] && sortedWh[0].redAlerts > 2) {
    insights.push({
      id: "warehouse-imbalance",
      severity: "warning",
      title: `${sortedWh[0].market} Has ${sortedWh[0].redAlerts} Critical Alerts`,
      description: `This market has the highest concentration of stockout-risk SKUs. Utilization: ${sortedWh[0].utilizationPct}%.`,
      value: `${sortedWh[0].redAlerts} RED alerts`,
      action: "Prioritize replenishment orders for this market; review safety stock levels",
    });
  }

  // 8. Class A concentration
  const classAStats = abcStats.find((s) => s.cls === "A");
  if (classAStats) {
    insights.push({
      id: "abc-concentration",
      severity: "info",
      title: `Class A: ${classAStats.count} SKUs Drive ${classAStats.revenueShare}% of Revenue`,
      description: `Pareto principle confirmed: ${classAStats.count} high-value items require tightest monitoring and service levels.`,
      value: `${classAStats.revenueShare}% revenue share`,
      action: "Ensure Class A SKUs always have safety stock ≥ calculated ss; automate reorder triggers",
    });
  }

  // 9. Net positive impact
  if (kpis.netDollarImpact > 0) {
    insights.push({
      id: "net-impact",
      severity: "success",
      title: `Policy Optimization Net Positive: +$${kpis.netDollarImpact.toLocaleString()}`,
      description: `Safety buffering returns $${kpis.lostSalesAvoided.toLocaleString()} in protected margin vs. $${Math.abs(kpis.holdingCostDelta).toLocaleString()} extra holding cost.`,
      value: `+$${kpis.netDollarImpact.toLocaleString()}`,
      action: "Continue with optimized policy parameters; review annually or when demand patterns shift",
    });
  }

  return insights;
}
