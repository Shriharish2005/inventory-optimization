import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, Treemap, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import { computeCostByCategory, computeCostBreakdown, type CostBreakdown } from "@/lib/inventory/analytics";
import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, TrendingUp, TrendingDown, Package } from "lucide-react";

const COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#3b82f6"];
const costConfig = { holding: { label: "Holding Cost" }, ordering: { label: "Ordering Cost" } } satisfies ChartConfig;
const skuConfig = { totalCost: { label: "Annual Cost ($)" } } satisfies ChartConfig;

const columns: ColumnDef<CostBreakdown, unknown>[] = [
  { accessorKey: "sku_id", header: "SKU" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "market", header: "Market" },
  { accessorKey: "abc_class", header: "Class", cell: ({ getValue }) => <Badge variant="outline" className="font-mono text-xs">{getValue() as string}</Badge> },
  { accessorKey: "holdingCost", header: "Holding Cost", cell: ({ getValue }) => <span className="font-mono text-amber-500">${(getValue() as number).toLocaleString()}</span> },
  { accessorKey: "orderingCost", header: "Ordering Cost", cell: ({ getValue }) => <span className="font-mono text-sky-500">${(getValue() as number).toLocaleString()}</span> },
  { accessorKey: "totalCost", header: "Total Cost", cell: ({ getValue }) => <span className="font-mono font-bold">${(getValue() as number).toLocaleString()}</span> },
  { accessorKey: "holdingShare", header: "Holding %", cell: ({ getValue }) => {
      const v = getValue() as number;
      return <Badge variant={v > 70 ? "destructive" : "outline"} className="font-mono text-xs">{v}%</Badge>;
    }
  },
  { accessorKey: "stockoutCost", header: "Avoided Stockout", cell: ({ getValue }) => <span className="font-mono text-emerald-500">${(getValue() as number).toLocaleString()}</span> },
];

export default function CostAnalysisView() {
  const { filters } = useInventoryFilters();

  const allCosts = useMemo(() => {
    const all = computeCostBreakdown();
    return all.filter(
      (r) => filters.categories.includes(r.category) && filters.markets.includes(r.market) && filters.abcClasses.includes(r.abc_class)
    );
  }, [filters]);

  const catCosts = useMemo(() => computeCostByCategory(), []);

  const totals = useMemo(() => ({
    holding: allCosts.reduce((s, r) => s + r.holdingCost, 0),
    ordering: allCosts.reduce((s, r) => s + r.orderingCost, 0),
    total: allCosts.reduce((s, r) => s + r.totalCost, 0),
    stockout: allCosts.reduce((s, r) => s + r.stockoutCost, 0),
  }), [allCosts]);

  const topCostSkus = useMemo(() => [...allCosts].sort((a, b) => b.totalCost - a.totalCost).slice(0, 20), [allCosts]);

  const treemapData = useMemo(() =>
    catCosts.map((c, i) => ({ name: c.category, size: c.total, color: COLORS[i % COLORS.length] })),
    [catCosts]
  );

  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, color } = props;
    if (width < 30 || height < 20) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} style={{ fill: color, stroke: "var(--background)", strokeWidth: 2, opacity: 0.85 }} rx={4} />
        {width > 60 && height > 30 && (
          <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight={600}>{name}</text>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Cost Analysis"
        subtitle="Holding, ordering, and stockout cost breakdown by product, category, and market — identify reduction opportunities."
      />
      <InventoryFilterBar />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Annual Cost", value: `$${Math.round(totals.total).toLocaleString()}`, icon: <DollarSign className="size-5 text-primary" />, color: "text-foreground", sub: "Holding + Ordering" },
          { label: "Holding Cost", value: `$${Math.round(totals.holding).toLocaleString()}`, icon: <TrendingUp className="size-5 text-amber-500" />, color: "text-amber-500", sub: `${Math.round((totals.holding / (totals.total || 1)) * 100)}% of total` },
          { label: "Ordering Cost", value: `$${Math.round(totals.ordering).toLocaleString()}`, icon: <Package className="size-5 text-sky-500" />, color: "text-sky-500", sub: `${Math.round((totals.ordering / (totals.total || 1)) * 100)}% of total` },
          { label: "Avoided Stockout Value", value: `$${Math.round(totals.stockout).toLocaleString()}`, icon: <TrendingDown className="size-5 text-emerald-500" />, color: "text-emerald-500", sub: "Lost margin protected" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card/70 backdrop-blur-md border-border/80">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <h3 className={`text-2xl font-extrabold mt-0.5 ${kpi.color}`}>{kpi.value}</h3>
                <span className="text-[10px] text-muted-foreground">{kpi.sub}</span>
              </div>
              {kpi.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Cost Bars + Treemap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionHeader title="Holding vs. Ordering Cost by Category" aside="Annual cost breakdown" />
          <Card className="bg-card/70 backdrop-blur-md">
            <CardContent className="pt-4">
              <ChartContainer config={costConfig} className="h-[300px] w-full">
                <BarChart data={catCosts} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="holding" stackId="a" fill="#f59e0b" name="Holding Cost" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="ordering" stackId="a" fill="#06b6d4" name="Ordering Cost" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionHeader title="Cost Treemap by Category" aside="Size = total inventory cost" />
          <Card className="bg-card/70 backdrop-blur-md">
            <CardContent className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap data={treemapData} dataKey="size" content={<CustomTreemapContent />} />
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Cost SKUs */}
      <div>
        <SectionHeader title="Cost Reduction Opportunities" aside={`Top ${topCostSkus.length} highest-cost SKUs`} />
        <div className="mb-3">
          <ChartContainer config={skuConfig} className="h-[280px] w-full">
            <BarChart data={topCostSkus} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 100 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis type="number" tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="sku_id" width={95} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                {topCostSkus.map((d, i) => <Cell key={i} fill={d.holdingShare > 70 ? "#f59e0b" : "#06b6d4"} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
        <DataTable columns={columns} data={allCosts} defaultSort={[{ id: "totalCost", desc: true }]} />
      </div>
    </div>
  );
}
