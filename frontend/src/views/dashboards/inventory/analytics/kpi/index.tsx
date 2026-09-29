import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { computeKpis } from "@/lib/inventory/analytics";
import { sensitivity } from "@/lib/inventory/data";
import {
  TrendingUp, ShieldCheck, Package, Brain,
  DollarSign, BarChart2, Target, Zap, Clock, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const sensitivityConfig = {
  total_holding_cost: { label: "Holding Cost", color: "#f59e0b" },
  est_lost_sales_value: { label: "Lost Sales Risk", color: "#ef4444" },
  total_cost_of_policy: { label: "Total Inventory Cost", color: "#38bdf8" },
} satisfies ChartConfig;

interface GaugeCardProps {
  title: string;
  value: number;
  max?: number;
  color: string;
  bgColor: string;
  badge: string;
  badgeVariant?: "emerald" | "amber" | "cyan" | "violet" | "sky" | "muted";
  subtitle: string;
  target?: string;
  icon: React.ReactNode;
}

function GaugeCard({
  title,
  value,
  max = 100,
  color,
  bgColor,
  badge,
  badgeVariant = "emerald",
  subtitle,
  target,
  icon,
}: GaugeCardProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const badgeStyles: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    muted: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card className="relative overflow-hidden bg-card/80 backdrop-blur-xl border border-border/70 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between">
      {/* Top ambient color glow */}
      <div
        className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border border-border/50" style={{ backgroundColor: bgColor }}>
            {icon}
          </div>
          <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
            {title}
          </CardTitle>
        </div>
        <Badge variant="outline" className={`text-[10px] font-mono px-2 py-0.5 border ${badgeStyles[badgeVariant]}`}>
          {badge}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col items-center">
        {/* Circular Ring Gauge */}
        <div className="relative my-2 flex items-center justify-center">
          <svg width={124} height={124} className="-rotate-90">
            {/* Background Track */}
            <circle
              cx={62}
              cy={62}
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-muted/20"
              strokeWidth={10}
            />
            {/* Progress Stroke */}
            <circle
              cx={62}
              cy={62}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={10}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
            />
          </svg>

          {/* Centered Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black tracking-tight" style={{ color }}>
              {value}%
            </span>
            {target && (
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Target: {target}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Subtitle / Description */}
        <p className="text-xs text-muted-foreground text-center mt-1 leading-relaxed px-1">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export default function KpiView() {
  const kpis = useMemo(() => computeKpis(), []);

  const sensitivityData = sensitivity.map((p) => ({
    ...p,
    service_level_pct: Math.round(p.service_level_target * 100),
  }));

  const bestSensitivity = sensitivity.reduce(
    (best, p) => (p.total_cost_of_policy < best.total_cost_of_policy ? p : best),
    sensitivity[0]
  );

  const kpiCards = [
    {
      label: "Stockout Rate (Optimized)",
      value: `${kpis.optimizedStockoutRate}%`,
      icon: <ShieldCheck className="size-4 text-emerald-400" />,
      badge: `-${kpis.pctReduction}%`,
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      sub: "Down from 4.2% naive baseline",
      accent: "#10b981",
    },
    {
      label: "Order Fill Rate",
      value: `${kpis.fillRate}%`,
      icon: <Package className="size-4 text-cyan-400" />,
      badge: "Target: 95%",
      badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      sub: "Orders fulfilled immediately from stock",
      accent: "#06b6d4",
    },
    {
      label: "Inventory Turnover",
      value: `${kpis.avgInventoryTurnover}×`,
      icon: <BarChart2 className="size-4 text-violet-400" />,
      badge: "Annualized",
      badgeColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      sub: "Average inventory cycles per year",
      accent: "#8b5cf6",
    },
    {
      label: "Forecast Accuracy (WAPE)",
      value: `${kpis.forecastAccuracyPct}%`,
      icon: <Brain className="size-4 text-primary" />,
      badge: `MAE: ${kpis.avgMae} u/d`,
      badgeColor: "text-primary bg-primary/10 border-primary/20",
      sub: "Multi-model demand predictability",
      accent: "#a855f7",
    },
    {
      label: "Net Optimization Benefit",
      value: `$${kpis.netDollarImpact.toLocaleString()}`,
      icon: <DollarSign className="size-4 text-emerald-400" />,
      badge: "+$10.5k net",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      sub: "Lost sales avoided minus holding cost",
      accent: "#10b981",
    },
    {
      label: "Lead Time Average",
      value: `${kpis.avgLeadTimeDays}d`,
      icon: <Clock className="size-4 text-amber-400" />,
      badge: `±${kpis.leadTimeVariability}d σ`,
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      sub: "Supplier delivery duration across catalog",
      accent: "#f59e0b",
    },
    {
      label: "Stockout Days Avoided",
      value: `${kpis.stockoutDaysAvoided.toLocaleString()}`,
      icon: <CheckCircle2 className="size-4 text-emerald-400" />,
      badge: "Simulated",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      sub: "Across 4-year backtest simulation",
      accent: "#10b981",
    },
    {
      label: "Total Holding Cost",
      value: `$${Math.round(kpis.totalInventoryCost).toLocaleString()}`,
      icon: <TrendingUp className="size-4 text-sky-400" />,
      badge: `${kpis.holdingCostRatio}% of policy`,
      badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      sub: "Balanced against stockout prevention",
      accent: "#0ea5e9",
    },
  ];

  // Performance vs Benchmark Bar Chart
  const perfData = [
    { metric: "Fill Rate", value: kpis.fillRate, benchmark: 95 },
    { metric: "Forecast Accuracy", value: kpis.forecastAccuracyPct, benchmark: 75 },
    { metric: "Service Level (Opt)", value: kpis.avgServiceLevelOptimized, benchmark: 95 },
    { metric: "Stockout Reduction", value: kpis.pctReduction, benchmark: 80 },
    { metric: "Delivery Adherence", value: 92.4, benchmark: 90 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="KPI & Performance Analysis"
        subtitle="Real-time performance metrics, service-level compliance, cost-to-serve sensitivity, and policy impact analysis."
      />
      <InventoryFilterBar />

      {/* Top KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.label}
            className="relative overflow-hidden bg-card/80 backdrop-blur-xl border border-border/70 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group"
          >
            {/* Ambient edge highlight */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: kpi.accent }}
            />
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground leading-snug">
                  {kpi.label}
                </span>
                <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 border ${kpi.badgeColor}`}>
                  {kpi.badge}
                </Badge>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  {kpi.value}
                </h3>
                <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
                  {kpi.icon}
                </div>
              </div>

              <span className="text-[11px] text-muted-foreground leading-tight">
                {kpi.sub}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Level Progress - Upgraded Glassmorphic Gauges */}
      <div>
        <SectionHeader
          title="Service Level & Fulfillment Health"
          aside="Radial compliance meters (4-year horizon)"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mt-2">
          <GaugeCard
            title="Optimized Service Level"
            value={kpis.avgServiceLevelOptimized}
            color="#10b981"
            bgColor="rgba(16, 185, 129, 0.15)"
            badge="Optimal"
            badgeVariant="emerald"
            subtitle="Catalog-wide availability under recommended policy"
            target="95.0%"
            icon={<ShieldCheck className="size-4 text-emerald-400" />}
          />
          <GaugeCard
            title="Order Fill Rate"
            value={kpis.fillRate}
            color="#06b6d4"
            bgColor="rgba(6, 182, 212, 0.15)"
            badge="Exceeding"
            badgeVariant="cyan"
            subtitle="Immediate order satisfaction without backorder"
            target="95.0%"
            icon={<Package className="size-4 text-cyan-400" />}
          />
          <GaugeCard
            title="Forecast Accuracy"
            value={kpis.forecastAccuracyPct}
            color="#8b5cf6"
            bgColor="rgba(139, 92, 246, 0.15)"
            badge="High Confidence"
            badgeVariant="violet"
            subtitle="Volume-weighted demand forecast predictability"
            target="75.0%"
            icon={<Brain className="size-4 text-violet-400" />}
          />
          <GaugeCard
            title="Delivery Fulfillment"
            value={kpis.orderFulfillmentRate}
            color="#38bdf8"
            bgColor="rgba(56, 189, 248, 0.15)"
            badge="Healthy"
            badgeVariant="sky"
            subtitle="Orders fulfilled within guaranteed supplier SLA"
            target="90.0%"
            icon={<Target className="size-4 text-sky-400" />}
          />
          <GaugeCard
            title="Naive Baseline Policy"
            value={kpis.avgServiceLevelNaive}
            color="#f59e0b"
            bgColor="rgba(245, 158, 11, 0.15)"
            badge="Sub-Optimal"
            badgeVariant="amber"
            subtitle="Legacy order rule without buffer protection"
            target="95.0%"
            icon={<AlertCircle className="size-4 text-amber-400" />}
          />
        </div>
      </div>

      {/* Benchmark Comparison & Sensitivity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Benchmark Bar Chart */}
        <div>
          <SectionHeader
            title="KPIs vs. Industry Standards"
            aside="Benchmark comparison"
          />
          <Card className="bg-card/80 backdrop-blur-xl border border-border/70 mt-2">
            <CardContent className="pt-5 pb-3">
              <div className="flex items-center justify-end gap-4 mb-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Current Performance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="text-muted-foreground">Industry Target</span>
                </div>
              </div>

              <ChartContainer
                config={{ value: { label: "Actual %" }, benchmark: { label: "Benchmark %" } }}
                className="h-[270px] w-full"
              >
                <BarChart data={perfData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" opacity={0.6} />
                  <XAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Actual">
                    {perfData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.value >= d.benchmark ? "#10b981" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="benchmark"
                    fill="var(--muted)"
                    radius={[4, 4, 0, 0]}
                    name="Benchmark"
                    opacity={0.35}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Service Level Sensitivity Cost Curve */}
        <div>
          <SectionHeader
            title="Service Level Cost Curve"
            aside="Optimal availability sweep"
          />
          <Card className="bg-card/80 backdrop-blur-xl border border-border/70 mt-2">
            <CardContent className="pt-5 pb-3">
              <div className="flex items-center justify-end gap-3 mb-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Holding Cost</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500" />
                  <span className="text-muted-foreground">Lost Sales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-sky-400" />
                  <span className="text-muted-foreground">Total Cost</span>
                </div>
              </div>

              <ChartContainer config={sensitivityConfig} className="h-[270px] w-full">
                <LineChart data={sensitivityData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" opacity={0.6} />
                  <XAxis
                    dataKey="service_level_pct"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    x={Math.round(bestSensitivity.service_level_target * 100)}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Optimal ${Math.round(bestSensitivity.service_level_target * 100)}%`,
                      fill: "#10b981",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Line dataKey="total_holding_cost" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
                  <Line dataKey="est_lost_sales_value" stroke="#ef4444" strokeWidth={1.8} dot={false} />
                  <Line dataKey="total_cost_of_policy" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Naive vs. Optimized Policy Head-to-Head Comparison */}
      <div>
        <SectionHeader
          title="Optimization Impact: Naive vs. Recommended Policy"
          aside="Head-to-head comparison"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-2">
          {[
            {
              metric: "Average Service Level",
              naive: `${kpis.avgServiceLevelNaive}%`,
              optimized: `${kpis.avgServiceLevelOptimized}%`,
              delta: `+${(kpis.avgServiceLevelOptimized - kpis.avgServiceLevelNaive).toFixed(1)}%`,
              improved: true,
              desc: "Availability increase with optimal safety stock buffers",
            },
            {
              metric: "Stockout Incidents",
              naive: `${Math.round(7584).toLocaleString()} days`,
              optimized: `${Math.round(564).toLocaleString()} days`,
              delta: `-${kpis.pctReduction}%`,
              improved: true,
              desc: "Drastic reduction in unfulfilled customer demand",
            },
            {
              metric: "Avoided Lost Sales Value",
              naive: "$0",
              optimized: `$${kpis.lostSalesAvoided.toLocaleString()}`,
              delta: `+$${kpis.lostSalesAvoided.toLocaleString()}`,
              improved: true,
              desc: "Captured revenue previously lost to out-of-stock events",
            },
            {
              metric: "Annual Holding Cost",
              naive: "$14,257",
              optimized: `$${Math.round(kpis.totalInventoryCost).toLocaleString()}`,
              delta: "+$32.8k",
              improved: false,
              desc: "Calculated capital investment required to sustain 99.5% SLA",
            },
            {
              metric: "Net Economic Impact",
              naive: "$0",
              optimized: `+$${kpis.netDollarImpact.toLocaleString()}`,
              delta: `+$${kpis.netDollarImpact.toLocaleString()} / yr`,
              improved: true,
              desc: "Net profit after deducting added holding cost from saved revenue",
            },
            {
              metric: "Order Replenishment Urgency",
              naive: "Unmanaged",
              optimized: `${kpis.urgentReplenishmentCount} SKUs`,
              delta: "Immediate Action",
              improved: true,
              desc: "Automated alert flags for items requiring purchase orders today",
            },
          ].map((row) => (
            <Card
              key={row.metric}
              className="bg-card/80 backdrop-blur-xl border border-border/70 hover:border-primary/40 transition-all p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground tracking-tight">
                    {row.metric}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono px-1.5 py-0 border flex items-center gap-1 ${
                      row.improved
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                    }`}
                  >
                    {row.improved ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {row.delta}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {row.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Naive Policy
                  </span>
                  <span className="font-mono text-xs font-semibold text-rose-400">
                    {row.naive}
                  </span>
                </div>
                <Zap className="size-3.5 text-primary opacity-60" />
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Optimized Policy
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {row.optimized}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
