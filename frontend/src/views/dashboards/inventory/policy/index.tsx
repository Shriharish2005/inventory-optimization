import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ShieldCheck,
  RefreshCw,
  Calculator,
  Info,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import { filterPolicy } from "@/lib/inventory/data";
import type { PolicyRow } from "@/types/inventory";

const stackConfig = {
  lead_time_demand: { label: "Lead-Time Demand (d × L)", color: "#0284c7" },
  safety_stock: { label: "Safety Stock Buffer (ss)", color: "#f59e0b" },
} satisfies ChartConfig;

function downloadCsv(rows: PolicyRow[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]) as (keyof PolicyRow)[];
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory_policy_optimization.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const columns: ColumnDef<PolicyRow, unknown>[] = [
  { accessorKey: "sku_id", header: "SKU" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "market", header: "Market" },
  {
    accessorKey: "abc_class",
    header: "Class",
    cell: ({ getValue }) => {
      const cls = getValue() as string;
      return (
        <Badge
          variant={cls === "A" ? "default" : cls === "B" ? "secondary" : "outline"}
          className="font-mono text-xs"
        >
          Class {cls}
        </Badge>
      );
    },
  },
  {
    accessorKey: "service_level",
    header: "Service Level",
    cell: ({ getValue }) => {
      const pct = Math.round((getValue() as number) * 100);
      return (
        <Badge variant="outline" className="font-mono text-xs text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
          {pct}% SLA
        </Badge>
      );
    },
  },
  {
    accessorKey: "avg_daily_demand",
    header: "Avg Demand",
    cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number).toFixed(1)} u/d</span>,
  },
  {
    accessorKey: "safety_stock",
    header: "Safety Stock (ss)",
    cell: ({ getValue }) => (
      <span className="font-mono font-bold text-amber-500">{(getValue() as number).toLocaleString()}</span>
    ),
  },
  {
    accessorKey: "reorder_point",
    header: "Reorder Point (s)",
    cell: ({ getValue }) => (
      <span className="font-mono font-bold text-sky-500">{(getValue() as number).toLocaleString()}</span>
    ),
  },
  {
    accessorKey: "eoq",
    header: "EOQ (Q)",
    cell: ({ getValue }) => (
      <span className="font-mono font-bold text-indigo-500">{(getValue() as number).toLocaleString()}</span>
    ),
  },
  { accessorKey: "orders_per_year", header: "Orders/yr" },
  {
    accessorKey: "annual_inventory_cost",
    header: "Annual Cost",
    cell: ({ getValue }) => (
      <span className="font-mono font-bold text-foreground">${Math.round(getValue() as number).toLocaleString()}</span>
    ),
  },
];

export default function InventoryPolicy() {
  const { filters } = useInventoryFilters();
  const rows = filterPolicy(filters);

  const [compositionMode, setCompositionMode] = useState<"units" | "ratio" | "dollar">("units");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.annual_inventory_cost - a.annual_inventory_cost), [rows]);

  const totalHolding = useMemo(() => sorted.reduce((s, r) => s + r.annual_holding_cost, 0), [sorted]);
  const totalOrdering = useMemo(() => sorted.reduce((s, r) => s + r.annual_ordering_cost, 0), [sorted]);
  const totalAnnualCost = useMemo(() => sorted.reduce((s, r) => s + r.annual_inventory_cost, 0), [sorted]);

  const totalSafetyStockUnits = useMemo(() => sorted.reduce((s, r) => s + r.safety_stock, 0), [sorted]);
  const totalReorderPointUnits = useMemo(() => sorted.reduce((s, r) => s + r.reorder_point, 0), [sorted]);
  const avgSafetyShare = useMemo(
    () => (totalReorderPointUnits ? Math.round((totalSafetyStockUnits / totalReorderPointUnits) * 100) : 0),
    [totalSafetyStockUnits, totalReorderPointUnits]
  );

  const chartData = useMemo(
    () =>
      sorted.map((r) => {
        const leadDemand = r.reorder_point - r.safety_stock;
        const total = r.reorder_point || 1;

        if (compositionMode === "ratio") {
          return {
            sku_id: r.sku_id,
            lead_time_demand: Math.round((leadDemand / total) * 100),
            safety_stock: Math.round((r.safety_stock / total) * 100),
            raw_lead: leadDemand,
            raw_ss: r.safety_stock,
            unit: "%",
          };
        } else if (compositionMode === "dollar") {
          const costFactor = r.annual_holding_cost / (r.reorder_point || 1);
          return {
            sku_id: r.sku_id,
            lead_time_demand: Math.round(leadDemand * costFactor),
            safety_stock: Math.round(r.safety_stock * costFactor),
            raw_lead: leadDemand,
            raw_ss: r.safety_stock,
            unit: "$",
          };
        }

        return {
          sku_id: r.sku_id,
          lead_time_demand: leadDemand,
          safety_stock: r.safety_stock,
          raw_lead: leadDemand,
          raw_ss: r.safety_stock,
          unit: "units",
        };
      }),
    [sorted, compositionMode]
  );

  const avgReorderVal = useMemo(() => {
    if (!chartData.length) return 0;
    const sum = chartData.reduce((s, d) => s + d.lead_time_demand + d.safety_stock, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Inventory Policy & (s, Q) Rules"
        subtitle="Mathematical policy parameters: Reorder Point (s), Safety Stock (ss), and Economic Order Quantity (Q)."
      />
      <InventoryFilterBar />

      {/* Policy Math Explainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/70 backdrop-blur-xl border-border/80 shadow-md hover:shadow-lg transition-all">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-amber-500">
                <ShieldCheck className="size-4" /> Safety Stock (ss)
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-500 bg-amber-500/10">
                ss = Z × σ_d × √L
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Buffer stock held to absorb demand spikes during lead time. Scales with target service level $Z$ score and lead-time variance.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-xl border-border/80 shadow-md hover:shadow-lg transition-all">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-sky-500">
                <RefreshCw className="size-4" /> Reorder Point (s)
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-sky-500/30 text-sky-500 bg-sky-500/10">
                s = (d × L) + ss
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inventory position trigger level: average demand during lead time plus safety buffer. When inventory reaches $s$, place a new order.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-xl border-border/80 shadow-md hover:shadow-lg transition-all">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs text-indigo-500">
                <Calculator className="size-4" /> Economic Order Quantity (Q)
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-500 bg-indigo-500/10">
                EOQ = √(2DS / H)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Optimal order batch quantity balancing annual holding costs ($H$) with fixed purchase order processing fees ($S$).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Total Policy Cost Summary Ledger */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/80 border-border/80 backdrop-blur-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Total Annual Inventory Cost</span>
              <h3 className="text-2xl font-extrabold text-foreground mt-0.5">${Math.round(totalAnnualCost).toLocaleString()}</h3>
              <span className="text-[10px] text-muted-foreground mt-1 block">Holding + Order Processing Fees</span>
            </div>
            <DollarSign className="size-7 text-primary shrink-0" />
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-border/80 backdrop-blur-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Annual Holding Cost Portion</span>
              <h3 className="text-2xl font-extrabold text-amber-500 mt-0.5">${Math.round(totalHolding).toLocaleString()}</h3>
              <span className="text-[10px] text-amber-500/90 font-medium mt-1 block">
                {Math.round((totalHolding / (totalAnnualCost || 1)) * 100)}% of Total Policy Budget
              </span>
            </div>
            <TrendingUp className="size-7 text-amber-500 shrink-0" />
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-border/80 backdrop-blur-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Annual Ordering Cost Portion</span>
              <h3 className="text-2xl font-extrabold text-sky-500 mt-0.5">${Math.round(totalOrdering).toLocaleString()}</h3>
              <span className="text-[10px] text-sky-500/90 font-medium mt-1 block">
                {Math.round((totalOrdering / (totalAnnualCost || 1)) * 100)}% of Total Policy Budget
              </span>
            </div>
            <Package className="size-7 text-sky-500 shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Upgraded Reorder Point Composition Section */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="Reorder Point Composition" aside="Lead-time demand plus safety variability buffer" />

        <Card className="bg-card/70 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-4">
            {/* Toolbar: Metric Switcher, Legend & Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-3">
                <Layers className="size-5 text-sky-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Safety Buffer vs. Lead-Time Demand Stack</h4>
                  <p className="text-xs text-muted-foreground">
                    Analyzing buffer composition for {chartData.length} active inventory policy rules.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Legend Chips */}
                <div className="flex items-center gap-3 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/50 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <span className="size-2.5 rounded-sm bg-sky-500" /> Lead-Time Demand
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <span className="size-2.5 rounded-sm bg-amber-500" /> Safety Stock Buffer ({avgSafetyShare}%)
                  </span>
                </div>

                {/* View Switcher Pills */}
                <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-lg border border-border/60 text-xs">
                  <Button
                    size="sm"
                    variant={compositionMode === "units" ? "default" : "ghost"}
                    onClick={() => setCompositionMode("units")}
                    className="h-6 text-[11px] px-2.5 rounded"
                  >
                    Units (Qty)
                  </Button>
                  <Button
                    size="sm"
                    variant={compositionMode === "ratio" ? "default" : "ghost"}
                    onClick={() => setCompositionMode("ratio")}
                    className="h-6 text-[11px] px-2.5 rounded"
                  >
                    Share (%)
                  </Button>
                  <Button
                    size="sm"
                    variant={compositionMode === "dollar" ? "default" : "ghost"}
                    onClick={() => setCompositionMode("dollar")}
                    className="h-6 text-[11px] px-2.5 rounded"
                  >
                    Exposure ($)
                  </Button>
                </div>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <ChartContainer config={stackConfig} className="h-[380px] w-full">
              <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                <XAxis dataKey="sku_id" tick={false} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: compositionMode === "units" ? "Reorder Point (Units)" : compositionMode === "ratio" ? "Share (%)" : "Capital Exposure ($)",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <ReferenceLine
                  y={avgReorderVal}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg: ${avgReorderVal} ${compositionMode === "units" ? "u" : compositionMode === "ratio" ? "%" : "$"}`,
                    fill: "#3b82f6",
                    fontSize: 10,
                    position: "top",
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, p) => {
                        const d = p?.[0]?.payload;
                        if (!d) return "";
                        return `${d.sku_id}`;
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="lead_time_demand"
                  stackId="a"
                  fill="#0284c7"
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                  onClick={(data: any) => {
                    if (data && data.sku_id) {
                      setSelectedSku(data.sku_id as string);
                    }
                  }}
                />
                <Bar
                  dataKey="safety_stock"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                  onClick={(data: any) => {
                    if (data && data.sku_id) {
                      setSelectedSku(data.sku_id as string);
                    }
                  }}
                />
              </BarChart>
            </ChartContainer>

            {/* Executive Mathematical Insight Callout Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200">
              <div className="flex items-start gap-2.5">
                <Info className="size-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-amber-400">Executive Safety Stock Trade-off Insight</span>
                  <p className="text-slate-300 leading-relaxed">
                    The <strong className="text-amber-400 font-semibold">amber buffer</strong> represents the cost of demand variability. Because safety stock scales with the square root of lead time (<span className="font-mono text-amber-300">ss ∝ √L</span>), halving a supplier's lead time reduces safety stock holding costs by <strong className="text-emerald-400 font-bold">~29.3%</strong> (not 50%), preserving cash while maintaining 99%+ target SLA.
                  </p>
                </div>
              </div>

              {selectedSku && (
                <Badge variant="outline" className="self-start sm:self-center shrink-0 border-amber-400/40 text-amber-300 bg-amber-500/20 text-xs px-2.5 py-1">
                  Active SKU: {selectedSku}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy Table Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionHeader title="Policy Parameters Directory" aside={`${sorted.length} SKUs configured`} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => downloadCsv(sorted)}>
            <Download className="size-3.5" /> Download Policy CSV
          </Button>
        </div>
        <DataTable columns={columns} data={sorted} defaultSort={[{ id: "annual_inventory_cost", desc: true }]} />
      </div>
    </div>
  );
}
