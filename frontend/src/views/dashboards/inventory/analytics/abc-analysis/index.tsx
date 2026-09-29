import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { computeAbcAnalysis } from "@/lib/inventory/analytics";
import { abc } from "@/lib/inventory/data";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import type { ColumnDef } from "@tanstack/react-table";
import type { AbcRow } from "@/types/inventory";

const ABC_COLORS = { A: "#10b981", B: "#f59e0b", C: "#94a3b8" };
const chartConfig = { revenue: { label: "Revenue ($)" }, cumPct: { label: "Cumulative %" } } satisfies ChartConfig;

const skuCols: ColumnDef<AbcRow, unknown>[] = [
  { accessorKey: "sku_id", header: "SKU" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "sub_category", header: "Sub-Category" },
  { accessorKey: "market", header: "Market" },
  {
    accessorKey: "abc_class", header: "ABC Class",
    cell: ({ getValue }) => {
      const cls = getValue() as string;
      return <Badge variant="outline" className="font-mono text-xs font-bold" style={{ color: ABC_COLORS[cls as "A"|"B"|"C"], borderColor: ABC_COLORS[cls as "A"|"B"|"C"] }}>Class {cls}</Badge>;
    }
  },
  { accessorKey: "revenue", header: "Annual Revenue", cell: ({ getValue }) => <span className="font-mono font-bold">${(getValue() as number).toLocaleString()}</span> },
  { accessorKey: "revenue_share", header: "Revenue Share", cell: ({ getValue }) => <span className="font-mono">{((getValue() as number) * 100).toFixed(2)}%</span> },
  { accessorKey: "cum_pct", header: "Cumulative %", cell: ({ getValue }) => <span className="font-mono">{((getValue() as number)).toFixed(1)}%</span> },
];

export default function AbcAnalysisView() {
  const { filters } = useInventoryFilters();
  const [selectedClass, setSelectedClass] = useState<"A" | "B" | "C" | "All">("All");

  const abcStats = useMemo(() => computeAbcAnalysis(), []);
  const totalRevenue = abc.reduce((s, r) => s + r.revenue, 0);

  const filteredAbc = useMemo(() => {
    let rows = abc.filter(
      (r) => filters.categories.includes(r.category) && filters.markets.includes(r.market)
    );
    if (selectedClass !== "All") rows = rows.filter((r) => r.abc_class === selectedClass);
    return rows.sort((a, b) => b.revenue - a.revenue);
  }, [filters, selectedClass]);

  // Pareto chart data
  const paretoData = useMemo(() => {
    const sorted = [...abc].sort((a, b) => b.revenue - a.revenue);
    let cum = 0;
    return sorted.map((r, idx) => {
      cum += r.revenue;
      return { idx, sku_id: r.sku_id, revenue: r.revenue, abc_class: r.abc_class, cumPct: totalRevenue ? (cum / totalRevenue) * 100 : 0 };
    });
  }, [totalRevenue]);

  // Category revenue breakdown
  const catRevenueData = useMemo(() => {
    const cats = Array.from(new Set(abc.map((r) => r.category)));
    return cats.map((cat) => {
      const rows = abc.filter((r) => r.category === cat);
      return {
        category: cat,
        A: rows.filter((r) => r.abc_class === "A").reduce((s, r) => s + r.revenue, 0),
        B: rows.filter((r) => r.abc_class === "B").reduce((s, r) => s + r.revenue, 0),
        C: rows.filter((r) => r.abc_class === "C").reduce((s, r) => s + r.revenue, 0),
      };
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="ABC Analysis"
        subtitle="Automatic product classification by annual consumption value — category-wise contribution, inventory concentration, and management policy."
      />
      <InventoryFilterBar />

      {/* ABC Class Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {abcStats.map((cls) => (
          <Card
            key={cls.cls}
            className={`bg-card/70 backdrop-blur-md border-2 cursor-pointer transition-all ${selectedClass === cls.cls ? "shadow-lg" : "border-border/50 hover:shadow-md"}`}
            style={selectedClass === cls.cls ? { borderColor: ABC_COLORS[cls.cls] } : {}}
            onClick={() => setSelectedClass(selectedClass === cls.cls ? "All" : cls.cls)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Badge
                  className="text-lg font-extrabold px-3 py-1"
                  style={{ background: ABC_COLORS[cls.cls], color: "white", borderColor: ABC_COLORS[cls.cls] }}
                >
                  Class {cls.cls}
                </Badge>
                <span className="text-2xl font-extrabold" style={{ color: ABC_COLORS[cls.cls] }}>{cls.count} SKUs</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{cls.description}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-3">
                <span className="text-muted-foreground">Revenue</span><span className="font-mono font-bold">${cls.revenue.toLocaleString()}</span>
                <span className="text-muted-foreground">Revenue Share</span>
                <span className="font-mono font-bold" style={{ color: ABC_COLORS[cls.cls] }}>{cls.revenueShare}%</span>
                <span className="text-muted-foreground">Avg Daily Demand</span><span className="font-mono">{cls.avgDemand} u/d</span>
                <span className="text-muted-foreground">Holding Cost</span><span className="font-mono">${cls.totalHoldingCost.toLocaleString()}</span>
                <span className="text-muted-foreground">Avg Lead Time</span><span className="font-mono">{cls.avgLeadTime}d</span>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Policy:</strong> {cls.managementPolicy}
              </div>
              {/* Share Progress Bar */}
              <div className="mt-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${cls.revenueShare}%`, background: ABC_COLORS[cls.cls] }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 text-right">{cls.revenueShare}% of total revenue</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pareto Chart */}
      <div>
        <SectionHeader title="Pareto Revenue Concentration Curve" aside="Revenue by SKU rank with cumulative % overlay" />
        <Card className="bg-card/70 backdrop-blur-md">
          <CardContent className="pt-4">
            <ChartContainer config={chartConfig} className="h-[340px] w-full">
              <BarChart data={paretoData} margin={{ top: 8, right: 40, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis dataKey="idx" tick={false} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.sku_id ?? ""} />} />
                <Bar yAxisId="left" dataKey="revenue" radius={[2, 2, 0, 0]}>
                  {paretoData.map((d, i) => <Cell key={i} fill={ABC_COLORS[d.abc_class as "A"|"B"|"C"]} />)}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#ffffff" strokeWidth={2} dot={false} strokeOpacity={0.6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category × ABC Revenue */}
      <div>
        <SectionHeader title="Revenue by Category & ABC Class" aside="Stacked class contribution per product category" />
        <Card className="bg-card/70 backdrop-blur-md">
          <CardContent className="pt-4">
            <ChartContainer config={{ A: { label: "Class A" }, B: { label: "Class B" }, C: { label: "Class C" } }} className="h-[260px] w-full">
              <BarChart data={catRevenueData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="A" stackId="a" fill="#10b981" name="Class A" />
                <Bar dataKey="B" stackId="a" fill="#f59e0b" name="Class B" />
                <Bar dataKey="C" stackId="a" fill="#94a3b8" name="Class C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* SKU Directory */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title="SKU ABC Classification Directory" aside={`${filteredAbc.length} SKUs`} />
          <div className="flex gap-1 bg-muted/70 p-1 rounded-lg border border-border/50">
            {(["All","A","B","C"] as const).map((cls) => (
              <button key={cls} onClick={() => setSelectedClass(cls)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${selectedClass === cls ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                style={selectedClass === cls && cls !== "All" ? { background: ABC_COLORS[cls as "A"|"B"|"C"], color: "white" } : selectedClass === cls ? { background: "var(--background)", color: "var(--foreground)" } : {}}>
                {cls === "All" ? "All" : `Class ${cls}`}
              </button>
            ))}
          </div>
        </div>
        <DataTable columns={skuCols} data={filteredAbc} defaultSort={[{ id: "revenue", desc: true }]} />
      </div>
    </div>
  );
}
