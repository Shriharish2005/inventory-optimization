import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import {
  computeDemandByCategory,
  computeDemandByMarket,
  computeTopSellers,
} from "@/lib/inventory/analytics";
import { policy, variability } from "@/lib/inventory/data";
import type { ColumnDef } from "@tanstack/react-table";
import {
  TrendingUp,
  Package,
  BarChart2,
  Globe,
  RotateCcw,
  X,
} from "lucide-react";

const CATEGORY_COLORS = ["#0284c7", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#3b82f6", "#ec4899", "#14b8a6"];

type TopRow = ReturnType<typeof computeTopSellers>[number] & { xyz_class?: string };

interface XyzItem {
  code: "X" | "Y" | "Z";
  name: string;
  label: string;
  criteria: string;
  value: number;
  demand: number;
  share: number;
  color: string;
}

function CustomXyzTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: XyzItem }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs min-w-[200px]">
      <div className="flex items-center gap-2 font-bold text-foreground pb-1.5 border-b border-border/50 mb-2">
        <span className="size-2.5 rounded-full shrink-0 shadow-2xs" style={{ background: d.color }} />
        <span>{d.name}</span>
      </div>
      <div className="flex flex-col gap-1 font-mono text-[11px]">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Criteria:</span>
          <span className="font-semibold text-foreground text-[10px]">{d.criteria}</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>SKU Volume:</span>
          <span className="font-bold text-foreground text-xs">{d.value} SKUs</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Portfolio Share:</span>
          <span className="font-semibold text-foreground">{d.share}%</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Daily Demand:</span>
          <span className="font-semibold text-foreground">{d.demand} u/d</span>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/40 text-[10px] text-primary font-medium">
        Click slice to filter products
      </div>
    </div>
  );
}

function CustomCategoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { category: string; totalDailyDemand: number; skuCount: number; avgCv: number } }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs min-w-[180px]">
      <div className="font-bold text-foreground pb-1.5 border-b border-border/50 mb-2">
        {d.category}
      </div>
      <div className="flex flex-col gap-1 font-mono text-[11px]">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Daily Demand:</span>
          <span className="font-bold text-foreground">{d.totalDailyDemand} u/d</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>SKU Count:</span>
          <span className="font-semibold text-foreground">{d.skuCount} SKUs</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Avg CV:</span>
          <span className="font-semibold text-foreground">{d.avgCv}</span>
        </div>
      </div>
    </div>
  );
}

export default function DemandAnalysisView() {
  const { filters } = useInventoryFilters();
  const [metricView, setMetricView] = useState<"demand" | "revenue">("demand");
  const [selectedXyz, setSelectedXyz] = useState<"All" | "X" | "Y" | "Z">("All");

  const catData = useMemo(() => computeDemandByCategory(), []);
  const mktData = useMemo(() => computeDemandByMarket(), []);
  const rawTopSellers = useMemo(() => computeTopSellers(25), []);

  const filteredPolicy = useMemo(
    () =>
      policy.filter(
        (p) =>
          filters.categories.includes(p.category) &&
          filters.markets.includes(p.market) &&
          filters.abcClasses.includes(p.abc_class),
      ),
    [filters],
  );

  const totalDailyDemand = filteredPolicy.reduce((s, r) => s + r.avg_daily_demand, 0);
  const totalAnnualDemand = Math.round(totalDailyDemand * 365);

  const varMap = useMemo(() => new Map(variability.map((v) => [v.sku_id, v])), []);

  // Detailed XYZ Volatility Breakdown
  const xyzDetails = useMemo<XyzItem[]>(() => {
    const counts = { X: 0, Y: 0, Z: 0 };
    const demandSum = { X: 0, Y: 0, Z: 0 };
    for (const p of filteredPolicy) {
      const v = varMap.get(p.sku_id);
      const xyz = v?.xyz_class;
      if (xyz === "X" || xyz === "Y" || xyz === "Z") {
        counts[xyz]++;
        demandSum[xyz] += p.avg_daily_demand;
      }
    }
    const total = filteredPolicy.length || 1;
    return [
      {
        code: "X",
        name: "X — Stable",
        label: "Low Volatility",
        criteria: "CV < 0.5 (Predictable)",
        value: counts.X,
        demand: Math.round(demandSum.X * 10) / 10,
        share: Math.round((counts.X / total) * 1000) / 10,
        color: "#10b981", // Emerald
      },
      {
        code: "Y",
        name: "Y — Variable",
        label: "Moderate Volatility",
        criteria: "0.5 ≤ CV ≤ 1.0 (Fluctuating)",
        value: counts.Y,
        demand: Math.round(demandSum.Y * 10) / 10,
        share: Math.round((counts.Y / total) * 1000) / 10,
        color: "#f59e0b", // Amber
      },
      {
        code: "Z",
        name: "Z — Highly Variable",
        label: "High Volatility",
        criteria: "CV > 1.0 (Erratic / Lumpy)",
        value: counts.Z,
        demand: Math.round(demandSum.Z * 10) / 10,
        share: Math.round((counts.Z / total) * 1000) / 10,
        color: "#ef4444", // Red
      },
    ];
  }, [filteredPolicy, varMap]);

  // Only non-zero slices for the Pie chart to avoid indexing mismatch
  const nonZeroXyz = useMemo(() => xyzDetails.filter((d) => d.value > 0), [xyzDetails]);

  // Top sellers with attached volatility class & filter support
  const topSellersWithXyz = useMemo(() => {
    return rawTopSellers.map((r) => ({
      ...r,
      xyz_class: varMap.get(r.sku_id)?.xyz_class ?? "—",
    }));
  }, [rawTopSellers, varMap]);

  const displayedTopSellers = useMemo(() => {
    if (selectedXyz === "All") return topSellersWithXyz.slice(0, 15);
    return topSellersWithXyz.filter((r) => r.xyz_class === selectedXyz).slice(0, 15);
  }, [topSellersWithXyz, selectedXyz]);

  const topCols: ColumnDef<TopRow, unknown>[] = [
    {
      accessorKey: "sku_id",
      header: "SKU",
      cell: ({ getValue }) => <span className="font-bold text-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: "abc_class",
      header: "ABC Class",
      cell: ({ getValue }) => <Badge variant="outline" className="font-mono text-xs font-semibold">Class {getValue() as string}</Badge>,
    },
    {
      accessorKey: "xyz_class",
      header: "Volatility (XYZ)",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const color = v === "X" ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : v === "Y" ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10";
        return (
          <Badge variant="outline" className={`font-mono text-xs font-bold ${color}`}>
            {v} — {v === "X" ? "Stable" : v === "Y" ? "Variable" : "Volatile"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "revenue",
      header: "Annual Revenue",
      cell: ({ getValue }) => <span className="font-mono font-bold text-foreground">${(getValue() as number).toLocaleString()}</span>,
    },
    {
      accessorKey: "demand",
      header: "Avg Daily Demand",
      cell: ({ getValue }) => <span className="font-mono font-medium">{getValue() as number} u/d</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Sales & Demand Analysis"
        subtitle="Category-wise, market-wise, and product-wise demand breakdown — top sellers, declining items, and demand predictability (XYZ volatility)."
      />
      <InventoryFilterBar />

      {/* Classical Executive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Monitored SKUs", value: filteredPolicy.length, icon: <Package className="size-5 text-primary" />, sub: "Filtered active portfolio" },
          { label: "Aggregate Daily Demand", value: `${Math.round(totalDailyDemand * 10) / 10} u/d`, icon: <BarChart2 className="size-5 text-sky-500" />, sub: "Across all product lines" },
          { label: "Annual Demand Volume", value: `${totalAnnualDemand.toLocaleString()} units`, icon: <TrendingUp className="size-5 text-emerald-500" />, sub: "Annualized throughput" },
          { label: "Market Regions Active", value: mktData.length, icon: <Globe className="size-5 text-violet-500" />, sub: `${catData.length} distinct categories` },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card border border-border/80 rounded-xl shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">{kpi.label}</span>
                <h3 className="text-2xl font-bold font-mono tracking-tight text-foreground mt-0.5">{kpi.value}</h3>
                <span className="text-[10px] text-muted-foreground/80">{kpi.sub}</span>
              </div>
              <div className="size-10 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                {kpi.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visual Analytics Grid: Category Demand + Enhanced XYZ Volatility Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left (2 cols): Category-Wise Daily Demand Bar Chart */}
        <div className="lg:col-span-2">
          <Card className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between h-full">
            <div className="p-4 pb-3 flex items-center justify-between border-b border-border/50 bg-muted/15">
              <div>
                <h3 className="text-xs font-semibold text-foreground tracking-tight">Category-Wise Daily Demand</h3>
                <p className="text-[11px] text-muted-foreground">Aggregate daily throughput velocity by product category</p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono border border-border/60 bg-background">
                {catData.length} Categories
              </Badge>
            </div>

            <CardContent className="p-4 pt-2">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData} margin={{ top: 22, right: 16, bottom: 4, left: -14 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                      content={<CustomCategoryTooltip />}
                    />
                    <Bar dataKey="totalDailyDemand" radius={[6, 6, 0, 0]}>
                      {catData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="totalDailyDemand"
                        position="top"
                        fill="var(--foreground)"
                        fontSize={11}
                        fontWeight={600}
                        offset={6}
                        formatter={(v: unknown) => (Number(v) > 0 ? `${v} u/d` : "")}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right (1 col): Enhanced Demand Volatility (XYZ) Donut Chart */}
        <div>
          <Card className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between h-full">
            <div className="p-4 pb-3 flex items-center justify-between border-b border-border/50 bg-muted/15">
              <div>
                <h3 className="text-xs font-semibold text-foreground tracking-tight">Demand Volatility (XYZ)</h3>
                <p className="text-[11px] text-muted-foreground">Demand variability & predictability segmentation</p>
              </div>
              {selectedXyz !== "All" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedXyz("All")}
                  className="h-6 text-[10px] gap-1 text-primary hover:bg-primary/10 px-2 cursor-pointer"
                >
                  <span>Class {selectedXyz}</span>
                  <X className="size-3" />
                </Button>
              )}
            </div>

            <CardContent className="p-4 pt-2 flex flex-col justify-between gap-3 flex-1">
              {/* Donut Chart with Centered Monitored SKUs KPI */}
              <div className="h-[175px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomXyzTooltip />} />
                    <Pie
                      data={nonZeroXyz}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={4}
                      cornerRadius={5}
                      onClick={(entry) => {
                        const item = entry as unknown as { code?: "X" | "Y" | "Z"; payload?: { code?: "X" | "Y" | "Z" } };
                        const code = item?.payload?.code || item?.code;
                        if (code) {
                          setSelectedXyz(selectedXyz === code ? "All" : code);
                        }
                      }}
                      cursor="pointer"
                    >
                      {nonZeroXyz.map((d) => (
                        <Cell
                          key={d.name}
                          fill={d.color}
                          stroke="var(--card)"
                          strokeWidth={2.5}
                          opacity={selectedXyz === "All" || selectedXyz === d.code ? 1 : 0.25}
                          className="transition-all duration-150 cursor-pointer hover:brightness-110"
                        />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="46%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground font-mono font-bold text-2xl tracking-tight"
                    >
                      {filteredPolicy.length}
                    </text>
                    <text
                      x="50%"
                      y="59%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Total SKUs
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Classical Interactive Legend with Criteria and Volume */}
              <div className="flex flex-col gap-1.5 text-xs pt-1 border-t border-border/40">
                {xyzDetails.map((d) => {
                  const isSelected = selectedXyz === d.code;
                  return (
                    <button
                      type="button"
                      key={d.code}
                      onClick={() => setSelectedXyz(isSelected ? "All" : d.code)}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-primary/10 border-primary/30 font-semibold shadow-2xs"
                          : d.value === 0
                            ? "opacity-50 border-transparent hover:bg-muted/40"
                            : "border-transparent hover:bg-muted/60 hover:border-border/60"
                      }`}
                      title={`${d.criteria} — Click to filter table`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-2.5 rounded-full shrink-0 shadow-2xs" style={{ background: d.color }} />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-foreground text-xs font-semibold">{d.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{d.criteria}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="text-muted-foreground">{d.share}%</span>
                        <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5 font-bold">
                          {d.value} SKUs
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Market Demand Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title="Market-Wise Demand & Revenue" aside="Geographic demand distribution and commercial turnover" />
          <div className="flex gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs shadow-2xs">
            <Button
              size="sm"
              variant={metricView === "demand" ? "default" : "ghost"}
              className="h-6 text-[11px] px-2.5 rounded cursor-pointer"
              onClick={() => setMetricView("demand")}
            >
              Daily Demand
            </Button>
            <Button
              size="sm"
              variant={metricView === "revenue" ? "default" : "ghost"}
              className="h-6 text-[11px] px-2.5 rounded cursor-pointer"
              onClick={() => setMetricView("revenue")}
            >
              Annual Revenue
            </Button>
          </div>
        </div>
        <Card className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-4 pt-3">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mktData} layout="vertical" margin={{ top: 6, right: 30, bottom: 4, left: 60 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (metricView === "revenue" ? `$${Math.round(v / 1000)}k` : `${v}`)}
                  />
                  <YAxis
                    type="category"
                    dataKey="market"
                    width={55}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs">
                          <div className="font-bold text-foreground mb-1">{d.market}</div>
                          <div className="font-mono text-[11px] text-muted-foreground flex flex-col gap-0.5">
                            <div>Daily Demand: <span className="font-bold text-foreground">{d.totalDailyDemand} u/d</span></div>
                            <div>Annual Revenue: <span className="font-bold text-foreground">${d.totalAnnualRevenue.toLocaleString()}</span></div>
                            <div>SKU Count: <span className="font-semibold text-foreground">{d.skuCount}</span></div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={metricView === "revenue" ? "totalAnnualRevenue" : "totalDailyDemand"}
                    radius={[0, 6, 6, 0]}
                  >
                    {mktData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey={metricView === "revenue" ? "totalAnnualRevenue" : "totalDailyDemand"}
                      position="right"
                      fill="var(--foreground)"
                      fontSize={11}
                      fontWeight={600}
                      offset={6}
                      formatter={(v: unknown) =>
                        metricView === "revenue" ? `$${Math.round(Number(v) / 1000)}k` : `${v} u/d`
                      }
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sellers Table (Synchronized with XYZ Filter) */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <SectionHeader
            title="Top-Selling Products"
            aside={
              selectedXyz === "All"
                ? "Ranked by annual commercial revenue"
                : `Filtered by Volatility Class ${selectedXyz} (${displayedTopSellers.length} products shown)`
            }
          />
          {selectedXyz !== "All" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedXyz("All")}
              className="h-7 text-xs gap-1.5 self-start sm:self-auto border-border/80 cursor-pointer"
            >
              <RotateCcw className="size-3" /> Reset Volatility Filter
            </Button>
          )}
        </div>
        <DataTable columns={topCols} data={displayedTopSellers} defaultSort={[{ id: "revenue", desc: true }]} />
      </div>

      {/* Category Demand Profiles */}
      <div>
        <SectionHeader title="Category Demand Profiles" aside="Zero-day intermittency, coefficient of variation (CV), and volume metrics" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catData.map((c, i) => (
            <Card key={c.category} className="bg-card border border-border/80 rounded-xl shadow-xs hover:border-border transition-colors">
              <CardContent className="p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="font-semibold text-xs text-foreground">{c.category}</span>
                  <span className="size-2.5 rounded-full shadow-2xs" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Portfolio SKUs</span>
                  <span className="font-mono font-bold text-right">{c.skuCount}</span>

                  <span className="text-muted-foreground">Daily Demand</span>
                  <span className="font-mono font-bold text-right">{c.totalDailyDemand} u/d</span>

                  <span className="text-muted-foreground">Annual Volume</span>
                  <span className="font-mono font-bold text-right">{c.totalAnnualDemand.toLocaleString()}</span>

                  <span className="text-muted-foreground">Average CV</span>
                  <span className="font-mono font-bold text-right">{c.avgCv}</span>

                  <span className="text-muted-foreground">Zero-Day Share</span>
                  <span className="font-mono font-bold text-right">{c.avgZeroDayShare}%</span>

                  <span className="text-muted-foreground">Leading SKU</span>
                  <span className="font-mono text-[10px] truncate text-right font-medium text-primary">{c.topSku}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
