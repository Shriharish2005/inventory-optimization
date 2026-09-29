import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { Matrix9Box } from "@/components/inventory/matrix-9box";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import { abc, variability, segmentation } from "@/lib/inventory/data";
import type { AbcClass, XyzClass } from "@/types/inventory";

const ABC_COLORS: Record<AbcClass, string> = {
  A: "var(--color-success)",
  B: "var(--color-warning)",
  C: "var(--color-muted-foreground)",
};
const XYZ_COLORS: Record<XyzClass, string> = {
  X: "var(--color-success)",
  Y: "var(--color-warning)",
  Z: "var(--color-destructive)",
};

const abcConfig = { revenue: { label: "Revenue" } } satisfies ChartConfig;
const varConfig = { cv: { label: "Coefficient of variation" } } satisfies ChartConfig;

function applyFilters<T extends { category?: string; market?: string; abc_class?: string }>(
  rows: T[],
  filters: { categories: string[]; markets: string[]; abcClasses: string[] },
) {
  return rows.filter(
    (r) =>
      (!r.category || filters.categories.includes(r.category)) &&
      (!r.market || filters.markets.includes(r.market)) &&
      (!r.abc_class || filters.abcClasses.includes(r.abc_class)),
  );
}

export default function InventoryCatalogue() {
  const { filters } = useInventoryFilters();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  const abcSorted = useMemo(
    () => applyFilters(abc, filters).sort((a, b) => b.revenue - a.revenue),
    [filters],
  );
  const totalRevenue = abcSorted.reduce((s, r) => s + r.revenue, 0);
  const classARevenue = abcSorted.filter((r) => r.abc_class === "A").reduce((s, r) => s + r.revenue, 0);
  const classACount = abcSorted.filter((r) => r.abc_class === "A").length;

  const abcChartData = useMemo(() => {
    let cum = 0;
    return abcSorted.map((r, idx) => {
      cum += r.revenue;
      return { idx, sku_id: r.sku_id, revenue: r.revenue, abc_class: r.abc_class, cum_pct: totalRevenue ? (100 * cum) / totalRevenue : 0 };
    });
  }, [abcSorted, totalRevenue]);

  const varFiltered = useMemo(() => applyFilters(variability, filters), [filters]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader title="Catalogue & Portfolio Segmentation" subtitle="Revenue concentration (ABC) crossed with demand predictability (XYZ)." />
      <InventoryFilterBar />

      {/* 9-Box Matrix Portfolio Segmentation */}
      {segmentation.summary.length > 0 && (
        <div>
          <SectionHeader title="ABC-XYZ 9-Box Matrix" aside="Click any box to inspect policy strategy" />
          <Card className="bg-card/70 backdrop-blur-md border-border/80">
            <CardContent className="pt-6">
              <Matrix9Box
                summary={segmentation.summary}
                selectedSegment={selectedSegment}
                onSelectSegment={(seg) => setSelectedSegment(selectedSegment === seg ? null : seg)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <SectionHeader title="Revenue Concentration" aside="ABC Pareto distribution by cumulative revenue share" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <ChartContainer config={abcConfig} className="h-[380px] w-full">
                <BarChart data={abcChartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis dataKey="idx" tick={false} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.sku_id ?? ""} />}
                  />
                  <Bar dataKey="revenue">
                    {abcChartData.map((d, idx) => (
                      <Cell key={idx} fill={ABC_COLORS[d.abc_class as AbcClass]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground font-semibold">{classACount}</strong> of{" "}
              {abcSorted.length} items carry{" "}
              <strong className="text-foreground font-semibold">
                {totalRevenue ? Math.round((100 * classARevenue) / totalRevenue) : 0}%
              </strong>{" "}
              of revenue. Those get the tightest service-level target and the most forecasting
              attention; the long tail gets a simple rule and is allowed to stock out occasionally.
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <SectionHeader title="Demand Predictability" aside="Variability measured on weekly demand buckets" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <ChartContainer config={varConfig} className="h-[380px] w-full">
                <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis
                    type="number"
                    dataKey="mean"
                    name="Avg daily demand"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="cv"
                    name="Coefficient of variation"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ZAxis type="number" dataKey="zero_day_share" range={[20, 220]} />
                  <ChartTooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.sku_id ?? ""} />}
                  />
                  {(["X", "Y", "Z"] as XyzClass[]).map((cls) => (
                    <Scatter
                      key={cls}
                      name={cls}
                      data={varFiltered.filter((v) => v.xyz_class === cls)}
                      fill={XYZ_COLORS[cls]}
                      fillOpacity={0.75}
                    />
                  ))}
                </ScatterChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
              Bubble size represents the share of days with zero sales. Variability is measured weekly:
              daily demand here is so intermittent that every item's daily coefficient of variation
              looks extreme, which made standard classification useless until the measurement window
              changed.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
