// TypeScript port of src/common/policy.py's compute_policy(), used only by
// the What-if view for live, client-side recalculation. This mirrors the
// Python formula exactly (same z-score approximation, same rounding) so the
// numbers a viewer sees here match what the pipeline would produce for the
// same inputs. Numerically verified against the Python implementation
// directly (see project notes) across a range of inputs.

export interface SkuPolicy {
  serviceLevel: number;
  zScore: number;
  safetyStock: number;
  reorderPoint: number;
  eoq: number;
  ordersPerYear: number;
  annualHoldingCost: number;
  annualOrderingCost: number;
  annualInventoryCost: number;
}

/**
 * Inverse normal CDF (Acklam's algorithm), matching scipy.stats.norm.ppf to
 * within ~1.15e-9 -- more than sufficient precision for inventory policy
 * numbers, which round to 1-2 decimal places anyway.
 */
export function normPpf(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error(`normPpf: p must be in (0, 1), got ${p}`);
  }

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= 1 - pLow) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((( a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

export function computePolicy(
  avgDailyDemand: number,
  stdDailyDemand: number,
  leadTimeDays: number,
  unitCost: number,
  orderCost: number,
  holdingCostPct: number,
  serviceLevel: number,
): SkuPolicy {
  if (avgDailyDemand < 0 || stdDailyDemand < 0) {
    throw new Error("demand statistics must be non-negative");
  }
  if (leadTimeDays <= 0) {
    throw new Error(`leadTimeDays must be positive, got ${leadTimeDays}`);
  }
  if (!(serviceLevel > 0 && serviceLevel < 1)) {
    throw new Error(`serviceLevel must be in (0, 1), got ${serviceLevel}`);
  }

  const z = normPpf(serviceLevel);
  const safetyStock = Math.max(0, z * stdDailyDemand * Math.sqrt(leadTimeDays));
  const reorderPoint = avgDailyDemand * leadTimeDays + safetyStock;

  const annualDemand = avgDailyDemand * 365;
  const holdingCostPerUnit = Math.max(unitCost * holdingCostPct, 1e-6);

  let eoq = annualDemand <= 0 ? 0 : Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
  eoq = Math.max(eoq, 1);

  const ordersPerYear = eoq ? annualDemand / eoq : 0;
  const annualHoldingCost = (eoq / 2 + safetyStock) * holdingCostPerUnit;
  const annualOrderingCost = ordersPerYear * orderCost;

  return {
    serviceLevel,
    zScore: round(z, 3),
    safetyStock: round(safetyStock, 1),
    reorderPoint: round(reorderPoint, 1),
    eoq: round(eoq, 0),
    ordersPerYear: round(ordersPerYear, 1),
    annualHoldingCost: round(annualHoldingCost, 2),
    annualOrderingCost: round(annualOrderingCost, 2),
    annualInventoryCost: round(annualHoldingCost + annualOrderingCost, 2),
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
