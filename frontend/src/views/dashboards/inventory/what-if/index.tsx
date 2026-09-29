import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { SectionHeader } from "@/components/inventory/section-header";
import { policy, skuDim } from "@/lib/inventory/data";
import { computePolicy } from "@/lib/inventory/policy";
import {
  Target,
  Clock,
  DollarSign,
  ShoppingCart,
  Percent,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Plus,
  Minus,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Scale,
} from "lucide-react";

const costConfig = {
  annual_cost: { label: "Annual Inventory Cost", color: "var(--primary)" },
} satisfies ChartConfig;

function fmtDelta(next: number, current: number, unit = "") {
  const d = next - current;
  if (Math.abs(d) < 0.005) return "Unchanged";
  const pct = current !== 0 ? Math.round(((next - current) / current) * 100) : 0;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toLocaleString(undefined, { maximumFractionDigits: 0 })}${unit} (${sign}${pct}%) vs baseline`;
}

interface ClassicalParameterCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  baselineVal?: number;
  onChange: (val: number) => void;
  formatDisplay?: (val: number) => string;
}

function ClassicalParameterCard({
  icon: Icon,
  title,
  subtitle,
  unit,
  value,
  min,
  max,
  step,
  baselineVal,
  onChange,
  formatDisplay,
}: ClassicalParameterCardProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const diffFromBase = baselineVal !== undefined ? Math.round((value - baselineVal) * 100) / 100 : 0;
  const isChanged = baselineVal !== undefined && Math.abs(diffFromBase) > 0.001;

  const handleStep = (dir: 1 | -1) => {
    const next = Math.round((value + dir * step) * 100) / 100;
    onChange(Math.max(min, Math.min(max, next)));
  };

  const displayVal = formatDisplay
    ? formatDisplay(value)
    : Number.isInteger(value)
      ? value.toString()
      : value.toFixed(value < 10 ? 2 : 1);

  return (
    <Card className="bg-card border border-border/80 hover:border-primary/40 rounded-xl shadow-xs transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Classical Card Header */}
      <div className="p-3.5 pb-2.5 flex items-start justify-between gap-2 border-b border-border/50 bg-muted/15">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0 text-primary group-hover:bg-primary/15 transition-colors">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-foreground tracking-tight truncate">{title}</h4>
            <span className="text-[10px] text-muted-foreground/90 font-mono tracking-tight">{unit} parameter</span>
          </div>
        </div>

        {/* Baseline Reference Tag */}
        <div className="shrink-0 flex items-center">
          {baselineVal !== undefined && (
            isChanged ? (
              <Badge
                variant="outline"
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1"
                title="Current value differs from SKU standard baseline"
              >
                <span>Base: {baselineVal}{unit}</span>
                <span className="opacity-90 font-bold">({diffFromBase > 0 ? `+${diffFromBase}` : diffFromBase})</span>
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-[10px] font-mono text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 font-normal"
              >
                Base: {baselineVal}{unit}
              </Badge>
            )
          )}
        </div>
      </div>

      {/* Classical Card Body */}
      <div className="p-3.5 pt-3 flex flex-col gap-3">
        {/* Metric Display & Precision Stepper Input */}
        <div className="flex items-center justify-between gap-3">
          {/* High-Contrast Large Readout */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
              {displayVal}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">{unit}</span>
          </div>

          {/* Integrated Precision Stepper */}
          <div className="flex items-center gap-1 bg-muted/40 border border-border/70 rounded-lg p-0.5 shadow-2xs">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => handleStep(-1)}
              disabled={value <= min}
              className="size-6 rounded hover:bg-background shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
              title="Decrease"
            >
              <Minus className="size-3" />
            </Button>

            <Input
              type="number"
              min={min}
              max={max}
              step={step}
              value={Number.isNaN(value) ? "" : value}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onChange(val);
              }}
              className="h-6 w-16 font-mono font-bold text-xs bg-background border-border/60 text-center rounded px-1 shadow-2xs focus-visible:ring-1 focus-visible:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => handleStep(1)}
              disabled={value >= max}
              className="size-6 rounded hover:bg-background shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
              title="Increase"
            >
              <Plus className="size-3" />
            </Button>
          </div>
        </div>

        {/* Custom Precision Slider */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="classical-slider"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${pct}%, var(--border) ${pct}%, var(--border) 100%)`,
            }}
          />

          <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground/75 px-0.5">
            <span>Min: {min}{unit}</span>
            <span>Max: {max}{unit}</span>
          </div>
        </div>

        {/* Institutional Subtitle Description */}
        <p className="text-[11px] text-muted-foreground/85 leading-normal pt-2 border-t border-border/40 line-clamp-1">
          {subtitle}
        </p>
      </div>
    </Card>
  );
}

export default function InventoryWhatIf() {
  const [skuId, setSkuId] = useState(policy[0]?.sku_id ?? "");
  const base = policy.find((p) => p.sku_id === skuId) ?? policy[0];
  const baseSku = skuDim.find((s) => s.sku_id === skuId);

  // Scenario Preset state
  const [activePreset, setActivePreset] = useState<"optimal" | "conservative" | "lean" | "volatile" | "custom">("optimal");

  // States stored in user-facing percentage/numerical units for direct input
  const [serviceLevelPct, setServiceLevelPct] = useState(92.0); // Cost-minimizing 92%
  const [leadTimeDays, setLeadTimeDays] = useState(base.lead_time_days);
  const [unitCostVal, setUnitCostVal] = useState(baseSku?.unit_cost ?? 20);
  const [orderCostVal, setOrderCostVal] = useState(baseSku?.order_cost ?? 40);
  const [holdingCostPct, setHoldingCostPct] = useState(Math.round((baseSku?.holding_cost_pct ?? 0.2) * 100));
  const [demandShiftMult, setDemandShiftMult] = useState(1.0);

  const updateParam = (setter: (val: number) => void, val: number) => {
    setter(val);
    setActivePreset("custom");
  };

  const handleSkuChange = (id: string | null) => {
    if (!id) return;
    setSkuId(id);
    const p = policy.find((x) => x.sku_id === id);
    const s = skuDim.find((x) => x.sku_id === id);
    if (p) {
      setServiceLevelPct(Math.round(p.service_level * 1000) / 10);
      setLeadTimeDays(p.lead_time_days);
    }
    if (s) {
      setUnitCostVal(s.unit_cost);
      setOrderCostVal(s.order_cost);
      setHoldingCostPct(Math.round(s.holding_cost_pct * 100));
    }
    setDemandShiftMult(1.0);
    setActivePreset("custom");
  };

  const applyPreset = (preset: "optimal" | "conservative" | "lean" | "volatile") => {
    setActivePreset(preset);
    const currentBaseSku = skuDim.find((s) => s.sku_id === skuId);
    const currentBasePol = policy.find((p) => p.sku_id === skuId) ?? policy[0];

    const baseLT = currentBasePol.lead_time_days;
    const baseUnitCost = currentBaseSku?.unit_cost ?? 20;
    const baseOrderCost = currentBaseSku?.order_cost ?? 40;
    const baseHoldPct = Math.round((currentBaseSku?.holding_cost_pct ?? 0.2) * 100);

    setUnitCostVal(baseUnitCost);
    setOrderCostVal(baseOrderCost);
    setHoldingCostPct(baseHoldPct);

    if (preset === "optimal") {
      setServiceLevelPct(92.0);
      setLeadTimeDays(baseLT);
      setDemandShiftMult(1.0);
    } else if (preset === "conservative") {
      setServiceLevelPct(98.0);
      setLeadTimeDays(baseLT);
      setDemandShiftMult(1.0);
    } else if (preset === "lean") {
      setServiceLevelPct(85.0);
      setLeadTimeDays(Math.max(1, Math.round(baseLT * 0.5)));
      setDemandShiftMult(1.0);
    } else if (preset === "volatile") {
      setServiceLevelPct(95.0);
      setLeadTimeDays(baseLT);
      setDemandShiftMult(1.5);
    }
  };

  const resetToBaseline = () => {
    handleSkuChange(skuId);
  };

  const avgDemand = base.avg_daily_demand * demandShiftMult;
  const stdDemand = base.std_daily_demand * demandShiftMult;
  const serviceLevelDec = Math.max(0.8, Math.min(0.995, serviceLevelPct / 100));
  const holdingPctDec = Math.max(0.05, Math.min(0.6, holdingCostPct / 100));

  const result = useMemo(() => {
    try {
      return {
        policy: computePolicy(
          avgDemand,
          stdDemand,
          leadTimeDays,
          unitCostVal,
          orderCostVal,
          holdingPctDec,
          serviceLevelDec,
        ),
        error: null as string | null,
      };
    } catch (e) {
      return { policy: null, error: e instanceof Error ? e.message : "Invalid inputs" };
    }
  }, [avgDemand, stdDemand, leadTimeDays, unitCostVal, orderCostVal, holdingPctDec, serviceLevelDec]);

  const sweep = useMemo(() => {
    const points = [];
    for (let sl = 0.8; sl <= 0.995; sl += 0.005) {
      try {
        const p = computePolicy(
          avgDemand,
          stdDemand,
          leadTimeDays,
          unitCostVal,
          orderCostVal,
          holdingPctDec,
          sl,
        );
        points.push({ service_level_pct: Math.round(sl * 100), annual_cost: p.annualInventoryCost });
      } catch {
        // skip invalid
      }
    }
    return points;
  }, [avgDemand, stdDemand, leadTimeDays, unitCostVal, orderCostVal, holdingPctDec]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="What-if Policy Simulator"
        subtitle="Institutional sensitivity analysis and multi-parameter inventory policy optimization engine."
      />

      {/* Classical Policy Strategy Presets Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mr-1.5">
            <SlidersHorizontal className="size-3.5 text-primary" />
            <span>Policy Presets:</span>
          </div>

          <Button
            type="button"
            size="sm"
            variant={activePreset === "optimal" ? "default" : "outline"}
            className={`h-7 text-xs px-2.5 gap-1.5 font-medium transition-all ${
              activePreset === "optimal" ? "shadow-2xs" : "border-border/70 hover:bg-muted/50"
            }`}
            onClick={() => applyPreset("optimal")}
          >
            <Scale className="size-3.5 text-primary-foreground/90" />
            <span>Cost-Minimizing (92%)</span>
            {activePreset === "optimal" && <CheckCircle2 className="size-3 text-white ml-0.5" />}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activePreset === "conservative" ? "default" : "outline"}
            className={`h-7 text-xs px-2.5 gap-1.5 font-medium transition-all ${
              activePreset === "conservative" ? "shadow-2xs" : "border-border/70 hover:bg-muted/50"
            }`}
            onClick={() => applyPreset("conservative")}
          >
            <ShieldCheck className="size-3.5 text-primary-foreground/90" />
            <span>High SLA Protection (98%)</span>
            {activePreset === "conservative" && <CheckCircle2 className="size-3 text-white ml-0.5" />}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activePreset === "lean" ? "default" : "outline"}
            className={`h-7 text-xs px-2.5 gap-1.5 font-medium transition-all ${
              activePreset === "lean" ? "shadow-2xs" : "border-border/70 hover:bg-muted/50"
            }`}
            onClick={() => applyPreset("lean")}
          >
            <Clock className="size-3.5 text-primary-foreground/90" />
            <span>Lean / JIT Fast Cycle</span>
            {activePreset === "lean" && <CheckCircle2 className="size-3 text-white ml-0.5" />}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activePreset === "volatile" ? "default" : "outline"}
            className={`h-7 text-xs px-2.5 gap-1.5 font-medium transition-all ${
              activePreset === "volatile" ? "shadow-2xs" : "border-border/70 hover:bg-muted/50"
            }`}
            onClick={() => applyPreset("volatile")}
          >
            <TrendingUp className="size-3.5 text-primary-foreground/90" />
            <span>Demand Surge (+50%)</span>
            {activePreset === "volatile" && <CheckCircle2 className="size-3 text-white ml-0.5" />}
          </Button>
        </div>

        {/* Reset to Baseline Action */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resetToBaseline}
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground border-border/80 px-2.5"
          title="Reset all simulation values to baseline SKU defaults"
        >
          <RotateCcw className="size-3" /> Reset Baseline
        </Button>
      </div>

      {/* Simulation Parameters Grid */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="Policy Parameter Drivers"
          aside="Adjust calibrated sliders or fine-tune with stepper inputs"
        />

        {/* Classical SKU Selector & Context Header */}
        <Card className="bg-card border border-border/80 rounded-xl shadow-xs">
          <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <Label className="text-xs font-semibold text-foreground whitespace-nowrap flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Target SKU:
              </Label>
              <Select value={skuId} onValueChange={handleSkuChange}>
                <SelectTrigger className="h-8 font-bold text-xs w-full sm:w-[290px] bg-background border-border/80 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[320px] max-h-[320px]">
                  {policy.map((p) => (
                    <SelectItem key={p.sku_id} value={p.sku_id} className="text-xs py-1.5">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-bold text-foreground">{p.sku_id}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {p.category} · {p.market}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-mono py-0.5 px-2.5 border-border/70 bg-muted/30">
                Market: {base.market}
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono py-0.5 px-2.5 border-border/70 bg-muted/30">
                Class: {base.abc_class}
              </Badge>
              {activePreset === "custom" ? (
                <Badge variant="secondary" className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 py-0.5 px-2.5">
                  Custom Mode
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 py-0.5 px-2.5">
                  Preset Mode
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 6 Classical Parameter Control Cards (Refined Monochromatic / Corporate Palette) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <ClassicalParameterCard
            icon={Target}
            title="Service Level Target"
            subtitle="Target cycle service level probability buffer (Z-score)"
            unit="%"
            value={serviceLevelPct}
            min={80.0}
            max={99.5}
            step={0.5}
            baselineVal={Math.round(base.service_level * 1000) / 10}
            onChange={(v) => updateParam(setServiceLevelPct, Math.max(80, Math.min(99.5, v)))}
          />

          <ClassicalParameterCard
            icon={Clock}
            title="Replenishment Lead Time"
            subtitle="Supplier order replenishment lead turnaround duration"
            unit="Days"
            value={leadTimeDays}
            min={1}
            max={120}
            step={1}
            baselineVal={base.lead_time_days}
            onChange={(v) => updateParam(setLeadTimeDays, Math.max(1, v))}
          />

          <ClassicalParameterCard
            icon={DollarSign}
            title="Unit Procurement Cost"
            subtitle="Wholesale purchase cost per item unit"
            unit="$"
            value={unitCostVal}
            min={0.01}
            max={2500}
            step={1}
            baselineVal={baseSku?.unit_cost}
            onChange={(v) => updateParam(setUnitCostVal, Math.max(0.01, v))}
            formatDisplay={(v) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          />

          <ClassicalParameterCard
            icon={ShoppingCart}
            title="Fixed Cost per Order"
            subtitle="Procurement purchase order and logistics processing fee"
            unit="$"
            value={orderCostVal}
            min={1}
            max={500}
            step={5}
            baselineVal={baseSku?.order_cost}
            onChange={(v) => updateParam(setOrderCostVal, Math.max(1, v))}
            formatDisplay={(v) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          />

          <ClassicalParameterCard
            icon={Percent}
            title="Annual Holding Cost Rate"
            subtitle="Capital carrying cost, insurance and warehousing percentage"
            unit="%"
            value={holdingCostPct}
            min={5}
            max={60}
            step={1}
            baselineVal={Math.round((baseSku?.holding_cost_pct ?? 0.2) * 100)}
            onChange={(v) => updateParam(setHoldingCostPct, Math.max(5, Math.min(60, v)))}
          />

          <ClassicalParameterCard
            icon={TrendingUp}
            title="Demand Shift Multiplier"
            subtitle="Simulated daily customer demand surge or contraction factor"
            unit="×"
            value={demandShiftMult}
            min={0.5}
            max={3.0}
            step={0.05}
            baselineVal={1.0}
            onChange={(v) => updateParam(setDemandShiftMult, Math.max(0.5, Math.min(3.0, v)))}
            formatDisplay={(v) => `${v.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Classical Policy Calculation Output Cards */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="Simulated Policy Output"
          aside="Mathematical safety stock, reorder point, and annual carrying costs"
        />

        {result.error ? (
          <Card className="bg-destructive/10 border-destructive/30 rounded-xl">
            <CardContent className="py-4 text-xs font-semibold text-destructive">
              Calculation error: {result.error}
            </CardContent>
          </Card>
        ) : (
          result.policy && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <ClassicalResultMetric
                label="Safety Stock (ss)"
                value={result.policy.safetyStock.toLocaleString()}
                unit="units"
                delta={fmtDelta(result.policy.safetyStock, base.safety_stock, " units")}
                baseline={`Base: ${base.safety_stock.toLocaleString()}`}
                isIncrease={result.policy.safetyStock > base.safety_stock}
                isNeutral={result.policy.safetyStock === base.safety_stock}
              />
              <ClassicalResultMetric
                label="Reorder Point (s)"
                value={result.policy.reorderPoint.toLocaleString()}
                unit="units"
                delta={fmtDelta(result.policy.reorderPoint, base.reorder_point, " units")}
                baseline={`Base: ${base.reorder_point.toLocaleString()}`}
                isIncrease={result.policy.reorderPoint > base.reorder_point}
                isNeutral={result.policy.reorderPoint === base.reorder_point}
              />
              <ClassicalResultMetric
                label="Economic Order Qty (EOQ)"
                value={result.policy.eoq.toLocaleString()}
                unit="units"
                delta={fmtDelta(result.policy.eoq, base.eoq, " units")}
                baseline={`Base: ${base.eoq.toLocaleString()}`}
                isIncrease={result.policy.eoq > base.eoq}
                isNeutral={result.policy.eoq === base.eoq}
              />
              <ClassicalResultMetric
                label="Total Annual Inventory Cost"
                value={`$${result.policy.annualInventoryCost.toLocaleString()}`}
                delta={fmtDelta(result.policy.annualInventoryCost, base.annual_inventory_cost, "")}
                baseline={`Base: $${base.annual_inventory_cost.toLocaleString()}`}
                isIncrease={result.policy.annualInventoryCost > base.annual_inventory_cost}
                isNeutral={result.policy.annualInventoryCost === base.annual_inventory_cost}
                invertTone
              />
            </div>
          )
        )}
      </div>

      {/* Classical Cost of Service Curve */}
      {sweep.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Cost of Service Curve"
            aside="Non-linear trade-off between target cycle service level SLA and total inventory cost"
          />
          <Card className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <CardContent className="p-4">
              <ChartContainer config={costConfig} className="h-[250px] w-full">
                <AreaChart data={sweep} margin={{ top: 12, right: 12, bottom: 0, left: 10 }}>
                  <defs>
                    <linearGradient id="classicalCostGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                  <XAxis
                    dataKey="service_level_pct"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    x={Math.round(serviceLevelDec * 100)}
                    stroke="#2563eb"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Selected: ${Math.round(serviceLevelDec * 100)}%`,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: "#2563eb",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="annual_cost"
                    stroke="#2563eb"
                    fill="url(#classicalCostGlow)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ClassicalResultMetric({
  label,
  value,
  unit,
  delta,
  baseline,
  isIncrease,
  isNeutral,
  invertTone,
}: {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  baseline: string;
  isIncrease: boolean;
  isNeutral: boolean;
  invertTone?: boolean;
}) {
  const isPositive = invertTone ? !isIncrease : isIncrease;
  const badgeColor = isNeutral
    ? "text-muted-foreground bg-muted/50 border-border/50"
    : isPositive
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";

  return (
    <Card className="bg-card border border-border/80 rounded-xl shadow-xs p-4 flex flex-col justify-between hover:border-border transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground/75 bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
          {baseline}
        </span>
      </div>

      <div className="flex items-baseline gap-1 my-1">
        <span className="text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground font-medium">{unit}</span>}
      </div>

      <div className="pt-2 border-t border-border/40 mt-1 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${badgeColor}`}>
          {!isNeutral && (
            isIncrease ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />
          )}
          <span>{delta}</span>
        </span>
      </div>
    </Card>
  );
}
