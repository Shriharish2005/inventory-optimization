import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { WorldMap, type MetricType } from "@/components/inventory/world-map";
import { CountryDrawer } from "@/components/inventory/country-drawer";
import { geography } from "@/lib/inventory/data";
import type { GeographyRow } from "@/types/inventory";
import { Search, DollarSign, TrendingUp, Package, Percent, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const marginConfig = { margin_pct: { label: "Margin %" } } satisfies ChartConfig;

export default function InventoryGeography() {
  const [metric, setMetric] = useState<MetricType>("revenue");
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<GeographyRow | null>(null);

  const filtered = useMemo(
    () => (search ? geography.filter((g) => g.Country.toLowerCase().includes(search.toLowerCase())) : geography),
    [search],
  );

  const topMarkets = useMemo(() => {
    return [...geography]
      .sort((a, b) => {
        if (metric === "margin_pct") return b.margin_pct - a.margin_pct;
        return (b[metric] as number) - (a[metric] as number);
      })
      .slice(0, 12)
      .reverse();
  }, [metric]);

  const dynamicChartConfig = useMemo(() => {
    const labels: Record<MetricType, string> = {
      revenue: "Revenue",
      profit: "Net Profit",
      units: "Units Shipped",
      margin_pct: "Margin %",
    };
    return { [metric]: { label: labels[metric] } } satisfies ChartConfig;
  }, [metric]);

  const metricColors: Record<MetricType, string> = {
    revenue: "#10b981",
    profit: "#06b6d4",
    units: "#8b5cf6",
    margin_pct: "#f59e0b",
  };

  const metricTitleMap: Record<MetricType, string> = {
    revenue: "Revenue ($)",
    profit: "Net Profit ($)",
    units: "Units Shipped",
    margin_pct: "Margin %",
  };

  const thinMargins = useMemo(() => {
    const medianRevenue = [...geography].sort((a, b) => a.revenue - b.revenue)[Math.floor(geography.length / 2)]
      ?.revenue ?? 0;
    return [...geography]
      .filter((g) => g.revenue > medianRevenue)
      .sort((a, b) => a.margin_pct - b.margin_pct)
      .slice(0, 12)
      .reverse();
  }, []);

  const totalGlobalRevenue = useMemo(() => geography.reduce((s, g) => s + g.revenue, 0), []);
  const totalGlobalProfit = useMemo(() => geography.reduce((s, g) => s + g.profit, 0), []);
  const totalGlobalUnits = useMemo(() => geography.reduce((s, g) => s + g.units, 0), []);
  const avgMarginPct = useMemo(
    () => (totalGlobalRevenue ? (totalGlobalProfit / totalGlobalRevenue) * 100 : 0),
    [totalGlobalRevenue, totalGlobalProfit],
  );

  const countryRanks = useMemo(() => {
    const sorted = [...geography].sort((a, b) => b.revenue - a.revenue);
    const map = new Map<string, number>();
    sorted.forEach((c, idx) => map.set(c.Country, idx + 1));
    return map;
  }, []);

  const columns: ColumnDef<GeographyRow, unknown>[] = [
    { accessorKey: "Country", header: "Country" },
    {
      accessorKey: "revenue",
      header: "Revenue",
      cell: ({ getValue }) => `$${Math.round(getValue() as number).toLocaleString()}`,
    },
    {
      accessorKey: "profit",
      header: "Profit",
      cell: ({ getValue }) => `$${Math.round(getValue() as number).toLocaleString()}`,
    },
    { accessorKey: "units", header: "Units", cell: ({ getValue }) => (getValue() as number).toLocaleString() },
    {
      accessorKey: "margin_pct",
      header: "Margin %",
      cell: ({ getValue }) => {
        const val = getValue() as number;
        return (
          <Badge
            variant={val < 0 ? "destructive" : val > 15 ? "default" : "secondary"}
            className="font-mono text-xs"
          >
            {val.toFixed(1)}%
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedCountry(row.original)}
          className="h-7 text-xs gap-1 text-primary hover:text-primary/80"
        >
          Inspect <ExternalLink className="size-3" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Geography & Global Market Coverage"
        subtitle={`Real retail revenue distribution across ${geography.length} active international countries.`}
      />

      {/* Top Global KPI Summary Ledger */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/70 backdrop-blur-md border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Total Global Revenue</span>
              <h3 className="text-xl font-bold text-foreground mt-0.5">
                ${Math.round(totalGlobalRevenue).toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-md border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Net Global Profit</span>
              <h3 className="text-xl font-bold text-emerald-500 mt-0.5">
                ${Math.round(totalGlobalProfit).toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-md border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Global Units Shipped</span>
              <h3 className="text-xl font-bold text-foreground mt-0.5">
                {totalGlobalUnits.toLocaleString()}
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Package className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-md border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Weighted Margin %</span>
              <h3 className="text-xl font-bold text-amber-500 mt-0.5">
                {avgMarginPct.toFixed(1)}%
              </h3>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Percent className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next-Level Interactive World Map */}
      <WorldMap
        data={geography}
        onSelectCountry={(c) => setSelectedCountry(c)}
        selectedCountryName={selectedCountry?.Country}
        metric={metric}
        onMetricChange={setMetric}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionHeader
            title={`Top Markets by ${metricTitleMap[metric]}`}
            aside="Ranked across international coverage"
          />
          <Card>
            <CardContent className="pt-6">
              <ChartContainer config={dynamicChartConfig} className="h-[380px] w-full">
                <BarChart data={topMarkets} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => {
                      if (metric === "revenue" || metric === "profit") return `$${Math.round(v / 1000)}k`;
                      if (metric === "units") return `${Math.round(v / 1000)}k`;
                      return `${v}%`;
                    }}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="Country"
                    width={100}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey={metric} radius={[0, 3, 3, 0]}>
                    {topMarkets.map((d, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          metric === "profit" && d.profit < 0
                            ? "#ef4444"
                            : metric === "margin_pct"
                            ? d.margin_pct < 0
                              ? "#ef4444"
                              : d.margin_pct > 15
                              ? "#10b981"
                              : "#f59e0b"
                            : metricColors[metric]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <div>
          <SectionHeader title="Thinnest Margins" aside="revenue-weighted, above-median only" />
          <Card>
            <CardContent className="pt-6">
              <ChartContainer config={marginConfig} className="h-[380px] w-full">
                <BarChart data={thinMargins} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="Country"
                    width={100}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine x={0} stroke="var(--foreground)" />
                  <Bar dataKey="margin_pct" radius={[0, 3, 3, 0]}>
                    {thinMargins.map((d, idx) => (
                      <Cell key={idx} fill={d.margin_pct < 0 ? "var(--color-destructive)" : "var(--color-warning)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground mt-2">
                Restricted to countries with above-median revenue to eliminate small-sample order variance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <SectionHeader title="All Countries Directory" aside={`${filtered.length} of ${geography.length}`} />
        <div className="relative mb-3 w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <DataTable columns={columns} data={filtered} defaultSort={[{ id: "revenue", desc: true }]} />
      </div>

      {/* Side Inspector Drawer */}
      <CountryDrawer
        country={selectedCountry}
        isOpen={!!selectedCountry}
        onClose={() => setSelectedCountry(null)}
        globalRank={selectedCountry ? countryRanks.get(selectedCountry.Country) : undefined}
        totalCountries={geography.length}
      />
    </div>
  );
}
