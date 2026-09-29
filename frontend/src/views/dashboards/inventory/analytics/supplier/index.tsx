import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { computeSupplierGroups, type SupplierGroup } from "@/lib/inventory/analytics";
import type { ColumnDef } from "@tanstack/react-table";
import { Clock, AlertTriangle, CheckCircle2, Package } from "lucide-react";

const columns: ColumnDef<SupplierGroup, unknown>[] = [
  { accessorKey: "leadTimeDays", header: "Lead Time (days)", cell: ({ getValue }) => <span className="font-mono font-bold text-sky-500">{getValue() as number}d</span> },
  { accessorKey: "skuCount", header: "SKUs Supplied", cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span> },
  {
    accessorKey: "reliabilityScore",
    header: "Reliability Score",
    cell: ({ getValue }) => {
      const v = getValue() as number;
      const color = v >= 80 ? "text-emerald-500" : v >= 60 ? "text-amber-500" : "text-destructive";
      const label = v >= 80 ? "High" : v >= 60 ? "Medium" : "Low";
      return <Badge variant="outline" className={`font-mono text-xs ${color}`}>{v} — {label}</Badge>;
    },
  },
  {
    accessorKey: "onTimeDeliveryProxy",
    header: "On-Time Delivery",
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${v}%`, background: v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444" }} />
          </div>
          <span className="font-mono text-xs">{v.toFixed(0)}%</span>
        </div>
      );
    },
  },
  { accessorKey: "avgDemand", header: "Avg Demand/SKU", cell: ({ getValue }) => <span className="font-mono">{getValue() as number} u/d</span> },
  { accessorKey: "totalHoldingCost", header: "Holding Cost", cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span> },
  {
    accessorKey: "categories",
    header: "Categories Supplied",
    cell: ({ getValue }) => {
      const cats = getValue() as string[];
      return <div className="flex flex-wrap gap-1">{cats.map((c) => <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c}</Badge>)}</div>;
    },
  },
];

export default function SupplierAnalysisView() {
  const [sortBy, setSortBy] = useState<"reliability" | "leadtime" | "skus">("reliability");
  const suppliers = useMemo(() => computeSupplierGroups(), []);

  const sorted = useMemo(() => {
    return [...suppliers].sort((a, b) =>
      sortBy === "reliability" ? b.reliabilityScore - a.reliabilityScore :
      sortBy === "leadtime" ? a.leadTimeDays - b.leadTimeDays :
      b.skuCount - a.skuCount
    );
  }, [suppliers, sortBy]);

  const avgLeadTime = useMemo(() => {
    const total = suppliers.reduce((s, g) => s + g.leadTimeDays * g.skuCount, 0);
    const skus = suppliers.reduce((s, g) => s + g.skuCount, 0);
    return Math.round((total / (skus || 1)) * 10) / 10;
  }, [suppliers]);

  const highRisk = useMemo(() => suppliers.filter((s) => s.reliabilityScore < 60), [suppliers]);
  const reliable = useMemo(() => suppliers.filter((s) => s.reliabilityScore >= 80), [suppliers]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Supplier Analysis"
        subtitle="Supplier performance, lead time analysis, on-time delivery metrics, and reliability scoring across supply groups."
      />
      <InventoryFilterBar />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Supplier Groups", value: suppliers.length, icon: <Package className="size-5 text-primary" />, sub: "By unique lead time" },
          { label: "Avg Lead Time", value: `${avgLeadTime}d`, icon: <Clock className="size-5 text-amber-500" />, sub: "Days to delivery" },
          { label: "High Risk Suppliers", value: highRisk.length, icon: <AlertTriangle className="size-5 text-destructive" />, sub: "Reliability < 60", color: "text-destructive" },
          { label: "Reliable Suppliers", value: reliable.length, icon: <CheckCircle2 className="size-5 text-emerald-500" />, sub: "Reliability ≥ 80", color: "text-emerald-500" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card/70 backdrop-blur-md border-border/80">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <h3 className={`text-2xl font-extrabold mt-0.5 ${(kpi as any).color ?? "text-foreground"}`}>{kpi.value}</h3>
                <span className="text-[10px] text-muted-foreground">{kpi.sub}</span>
              </div>
              {kpi.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionHeader title="Reliability Score by Lead Time Group" aside="Higher = more reliable supplier" />
          <Card className="bg-card/70 backdrop-blur-md">
            <CardContent className="pt-4">
              <ChartContainer config={{ reliabilityScore: { label: "Reliability Score" } }} className="h-[280px] w-full">
                <BarChart data={suppliers} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis dataKey="leadTimeDays" tickFormatter={(v) => `${v}d LT`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Lead Time: ${p?.[0]?.payload?.leadTimeDays}d`} />} />
                  <Bar dataKey="reliabilityScore" radius={[4, 4, 0, 0]}>
                    {suppliers.map((d, i) => <Cell key={i} fill={d.reliabilityScore >= 80 ? "#10b981" : d.reliabilityScore >= 60 ? "#f59e0b" : "#ef4444"} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionHeader title="On-Time Delivery by Lead Time Group" aside="% non-critical alerts per group" />
          <Card className="bg-card/70 backdrop-blur-md">
            <CardContent className="pt-4">
              <ChartContainer config={{ onTimeDeliveryProxy: { label: "On-Time Delivery %" } }} className="h-[280px] w-full">
                <BarChart data={suppliers} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 40 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="leadTimeDays" width={35} tickFormatter={(v) => `${v}d`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="onTimeDeliveryProxy" radius={[0, 4, 4, 0]}>
                    {suppliers.map((d, i) => <Cell key={i} fill={d.onTimeDeliveryProxy >= 80 ? "#10b981" : d.onTimeDeliveryProxy >= 60 ? "#f59e0b" : "#ef4444"} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Supplier Performance Callouts */}
      {highRisk.length > 0 && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-sm">
          <div className="flex items-center gap-2 mb-2 font-semibold text-destructive">
            <AlertTriangle className="size-4" /> {highRisk.length} High-Risk Supplier Group{highRisk.length > 1 ? "s" : ""} Detected
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Lead times of {highRisk.map((s) => `${s.leadTimeDays}d`).join(", ")} have reliability scores below 60.
            These groups contribute disproportionately to stockout risk — consider dual-sourcing or expedited orders for affected SKUs.
          </p>
        </div>
      )}

      {/* Detailed Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionHeader title="Supplier Group Directory" aside={`${suppliers.length} groups`} />
          <div className="flex gap-1 bg-muted/70 p-1 rounded-lg border border-border/50 text-xs">
            {(["reliability","leadtime","skus"] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${sortBy === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "reliability" ? "Reliability" : s === "leadtime" ? "Lead Time" : "SKU Count"}
              </button>
            ))}
          </div>
        </div>
        <DataTable columns={columns} data={sorted} defaultSort={[{ id: "reliabilityScore", desc: true }]} />
      </div>
    </div>
  );
}
