import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { computeStockHealth, type StockHealthRow, type StockHealthStatus } from "@/lib/inventory/analytics";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  PackageX,
  TrendingDown,
  Archive,
  CheckCircle2,
  X,
  RotateCcw,
  Search,
} from "lucide-react";

const STATUS_CONFIG: Record<StockHealthStatus, { color: string; icon: React.ReactNode; label: string }> = {
  Stockout:      { color: "#ef4444", icon: <PackageX className="size-4" />,      label: "Stockout" },
  "Low Stock":   { color: "#f59e0b", icon: <AlertTriangle className="size-4" />, label: "Low Stock" },
  Overstock:     { color: "#8b5cf6", icon: <Archive className="size-4" />,       label: "Overstock" },
  Healthy:       { color: "#10b981", icon: <CheckCircle2 className="size-4" />,  label: "Healthy" },
  "Dead Stock":  { color: "#64748b", icon: <PackageX className="size-4" />,      label: "Dead Stock" },
  "Slow Moving": { color: "#f97316", icon: <TrendingDown className="size-4" />,  label: "Slow Moving" },
};

const ALL_STATUSES: StockHealthStatus[] = ["Stockout", "Low Stock", "Overstock", "Healthy", "Dead Stock", "Slow Moving"];

const columns: ColumnDef<StockHealthRow, unknown>[] = [
  { accessorKey: "sku_id", header: "SKU", cell: ({ getValue }) => <span className="font-bold text-foreground">{getValue() as string}</span> },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "market", header: "Market" },
  {
    accessorKey: "status",
    header: "Health Status",
    cell: ({ getValue }) => {
      const s = getValue() as StockHealthStatus;
      const cfg = STATUS_CONFIG[s];
      return (
        <Badge
          variant="outline"
          className="gap-1.5 text-xs font-semibold px-2 py-0.5"
          style={{ borderColor: `${cfg.color}50`, color: cfg.color, background: `${cfg.color}10` }}
        >
          {cfg.icon} {s}
        </Badge>
      );
    },
  },
  {
    accessorKey: "stockOnHand",
    header: "On Hand",
    cell: ({ getValue }) => <span className="font-mono font-medium">{(getValue() as number).toLocaleString()}</span>,
  },
  {
    accessorKey: "reorderPoint",
    header: "Reorder Point",
    cell: ({ getValue }) => <span className="font-mono text-sky-600 dark:text-sky-400 font-medium">{(getValue() as number).toLocaleString()}</span>,
  },
  {
    accessorKey: "safetyStock",
    header: "Safety Stock",
    cell: ({ getValue }) => <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">{(getValue() as number).toLocaleString()}</span>,
  },
  {
    accessorKey: "daysOfCover",
    header: "Days Cover",
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return <span className="font-mono font-medium">{v != null ? v.toFixed(1) : "—"}</span>;
    },
  },
  {
    accessorKey: "stockValue",
    header: "Tied-Up Value",
    cell: ({ getValue }) => <span className="font-mono font-medium text-foreground">${(getValue() as number).toLocaleString()}</span>,
  },
  {
    accessorKey: "suggestedAction",
    header: "Recommended Action",
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground max-w-[260px] inline-block leading-tight">{getValue() as string}</span>
    ),
  },
];

interface TooltipItemPayload {
  status: StockHealthStatus;
  count: number;
  color: string;
  total: number;
  valueAmount: number;
}

function CustomBarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TooltipItemPayload }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const share = d.total > 0 ? ((d.count / d.total) * 100).toFixed(1) : "0";

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs min-w-[180px]">
      <div className="flex items-center gap-2 font-bold text-foreground pb-1.5 border-b border-border/50 mb-2">
        <span className="size-2.5 rounded-full shrink-0 shadow-2xs" style={{ background: d.color }} />
        <span>{d.status}</span>
      </div>
      <div className="flex flex-col gap-1 font-mono text-[11px]">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>SKU Count:</span>
          <span className="font-bold text-foreground text-xs">{d.count} SKUs</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Share:</span>
          <span className="font-semibold text-foreground">{share}%</span>
        </div>
        {d.valueAmount > 0 && (
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Inventory Value:</span>
            <span className="font-semibold text-foreground">${d.valueAmount.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/40 text-[10px] text-primary font-medium flex items-center justify-between">
        <span>Click bar to filter table</span>
      </div>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TooltipItemPayload }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const share = d.total > 0 ? ((d.count / d.total) * 100).toFixed(1) : "0";

  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs min-w-[170px]">
      <div className="flex items-center gap-2 font-bold text-foreground pb-1.5 border-b border-border/50 mb-2">
        <span className="size-2.5 rounded-full shrink-0 shadow-2xs" style={{ background: d.color }} />
        <span>{d.status}</span>
      </div>
      <div className="flex flex-col gap-1 font-mono text-[11px]">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Volume:</span>
          <span className="font-bold text-foreground text-xs">{d.count} SKUs</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Portfolio Share:</span>
          <span className="font-semibold text-foreground">{share}%</span>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/40 text-[10px] text-primary font-medium">
        Click slice to filter table
      </div>
    </div>
  );
}

export default function StockHealthView() {
  const { filters } = useInventoryFilters();
  const [statusFilter, setStatusFilter] = useState<StockHealthStatus | "All">("All");
  const [search, setSearch] = useState("");

  const allHealth = useMemo(() => {
    const all = computeStockHealth();
    return all.filter(
      (r) =>
        filters.categories.includes(r.category) &&
        filters.markets.includes(r.market) &&
        filters.abcClasses.includes(r.abc_class),
    );
  }, [filters]);

  const filtered = useMemo(() => {
    let rows = allHealth;
    if (statusFilter !== "All") rows = rows.filter((r) => r.status === statusFilter);
    if (search) rows = rows.filter((r) => r.sku_id.toLowerCase().includes(search.toLowerCase()));
    return rows;
  }, [allHealth, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const countMap: Record<string, number> = {};
    const valueMap: Record<string, number> = {};
    for (const r of allHealth) {
      countMap[r.status] = (countMap[r.status] ?? 0) + 1;
      valueMap[r.status] = (valueMap[r.status] ?? 0) + r.stockValue;
    }
    return ALL_STATUSES.map((s) => ({
      status: s,
      count: countMap[s] ?? 0,
      color: STATUS_CONFIG[s].color,
      total: allHealth.length,
      valueAmount: valueMap[s] ?? 0,
    }));
  }, [allHealth]);

  // Only non-zero items for the donut chart (with matched colors!)
  const nonZeroStatusCounts = useMemo(
    () => statusCounts.filter((d) => d.count > 0),
    [statusCounts],
  );

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Stock Health Analysis"
        subtitle="Real-time multi-echelon stock health monitoring — critical stockouts, replenishment buffer alerts, overstock capital, and dead inventory."
      />
      <InventoryFilterBar />

      {/* Classical Executive KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statusCounts.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const isSelected = statusFilter === item.status;
          const share = allHealth.length > 0 ? Math.round((item.count / allHealth.length) * 100) : 0;

          return (
            <Card
              key={item.status}
              className={`bg-card border rounded-xl cursor-pointer transition-all duration-200 select-none ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 shadow-sm"
                  : "border-border/80 hover:border-border hover:shadow-xs"
              }`}
              onClick={() => setStatusFilter(isSelected ? "All" : item.status)}
            >
              <CardContent className="p-3.5 flex flex-col justify-between h-full gap-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-foreground tracking-tight truncate">{item.status}</span>
                  <div
                    className="size-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}15`, color: cfg.color }}
                  >
                    {cfg.icon}
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                  <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: cfg.color }}>
                    {item.count}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 border-border/60">
                    {share}%
                  </Badge>
                </div>

                <div className="text-[10px] font-mono text-muted-foreground/80 flex items-center justify-between pt-1 border-t border-border/40">
                  <span>SKUs</span>
                  <span>{item.valueAmount > 0 ? `$${Math.round(item.valueAmount / 1000)}k` : "—"}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Analytical Visualizations (Bar Chart & Synchronized Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Status Distribution Bar Chart */}
        <Card className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 pb-3 flex items-center justify-between border-b border-border/50 bg-muted/15">
            <div>
              <h3 className="text-xs font-semibold text-foreground tracking-tight">Status Distribution</h3>
              <p className="text-[11px] text-muted-foreground">SKU volume across operational inventory health stages</p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono border border-border/60 bg-background">
              {allHealth.length} Total SKUs
            </Badge>
          </div>

          <CardContent className="p-4 pt-2">
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCounts} margin={{ top: 22, right: 12, bottom: 4, left: -14 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                    content={<CustomBarTooltip />}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) => {
                      const item = entry as unknown as { status?: StockHealthStatus };
                      if (item?.status) {
                        setStatusFilter(statusFilter === item.status ? "All" : item.status);
                      }
                    }}
                  >
                    {statusCounts.map((d) => (
                      <Cell
                        key={d.status}
                        fill={d.color}
                        opacity={statusFilter === "All" || statusFilter === d.status ? 1 : 0.25}
                        className="transition-all duration-150 cursor-pointer hover:brightness-110"
                      />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="var(--foreground)"
                      fontSize={11}
                      fontWeight={600}
                      offset={6}
                      formatter={(v: unknown) => (Number(v) > 0 ? String(v) : "")}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right: Health Composition Donut Chart (Strict Color Match & Central Metric) */}
        <Card className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 pb-3 flex items-center justify-between border-b border-border/50 bg-muted/15">
            <div>
              <h3 className="text-xs font-semibold text-foreground tracking-tight">Health Composition</h3>
              <p className="text-[11px] text-muted-foreground">Proportional portfolio share by inventory health category</p>
            </div>
            {statusFilter !== "All" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("All")}
                className="h-6 text-[10px] gap-1 text-primary hover:bg-primary/10 px-2 cursor-pointer"
              >
                <span>Filter: {statusFilter}</span>
                <X className="size-3" />
              </Button>
            )}
          </div>

          <CardContent className="p-4 pt-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-[270px]">
              {/* Donut Chart with Centered Total KPI Readout */}
              <div className="w-full sm:w-[52%] h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Pie
                      data={nonZeroStatusCounts}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={68}
                      outerRadius={102}
                      paddingAngle={3}
                      cornerRadius={5}
                      onClick={(entry) => {
                        const item = entry as unknown as { status?: StockHealthStatus; payload?: { status?: StockHealthStatus } };
                        const s = item?.payload?.status || item?.status;
                        if (s) {
                          setStatusFilter(statusFilter === s ? "All" : s);
                        }
                      }}
                      cursor="pointer"
                    >
                      {nonZeroStatusCounts.map((d) => (
                        <Cell
                          key={d.status}
                          fill={d.color}
                          stroke="var(--card)"
                          strokeWidth={2.5}
                          opacity={statusFilter === "All" || statusFilter === d.status ? 1 : 0.25}
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
                      {allHealth.length}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                    >
                      Total SKUs
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Classical Interactive Legend */}
              <div className="w-full sm:w-[48%] flex flex-col justify-center gap-1.5 text-xs pr-1">
                {nonZeroStatusCounts.map((d) => {
                  const isSelected = statusFilter === d.status;
                  const sharePct = allHealth.length > 0 ? ((d.count / allHealth.length) * 100).toFixed(1) : "0";

                  return (
                    <button
                      type="button"
                      key={d.status}
                      onClick={() => setStatusFilter(isSelected ? "All" : d.status)}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-primary/10 border-primary/30 font-semibold shadow-2xs"
                          : "border-transparent hover:bg-muted/60 hover:border-border/60"
                      }`}
                      title={`Filter table by ${d.status}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-2.5 rounded-full shrink-0 shadow-2xs" style={{ background: d.color }} />
                        <span className="truncate text-foreground text-xs">{d.status}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="text-muted-foreground">{sharePct}%</span>
                        <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5 font-bold">
                          {d.count}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filterable Table */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionHeader
            title="SKU-Level Stock Health Detail"
            aside={`${filtered.length} of ${allHealth.length} SKUs shown`}
          />

          {statusFilter !== "All" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusFilter("All")}
              className="h-7 text-xs gap-1.5 self-start sm:self-auto border-border/80"
            >
              <RotateCcw className="size-3" /> Reset Filter to All
            </Button>
          )}
        </div>

        {/* Search & Status Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2.5 items-center justify-between bg-card border border-border/80 p-2.5 rounded-xl shadow-xs">
          <div className="relative w-full sm:w-64">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search SKU ID…"
              className="h-8 pl-8 text-xs bg-background border-border/80 rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1.5 flex-wrap items-center">
            <Button
              size="sm"
              variant={statusFilter === "All" ? "default" : "outline"}
              className="h-7 text-xs px-2.5 border-border/80 cursor-pointer"
              onClick={() => setStatusFilter("All")}
            >
              All ({allHealth.length})
            </Button>

            {ALL_STATUSES.map((s) => {
              const count = statusCounts.find((item) => item.status === s)?.count ?? 0;
              const isSelected = statusFilter === s;
              const cfg = STATUS_CONFIG[s];

              return (
                <Button
                  key={s}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className="h-7 text-xs px-2.5 gap-1.5 border-border/80 cursor-pointer"
                  style={
                    isSelected
                      ? { background: cfg.color, borderColor: cfg.color, color: "#ffffff" }
                      : { color: count > 0 ? "inherit" : "var(--muted-foreground)" }
                  }
                  onClick={() => setStatusFilter(isSelected ? "All" : s)}
                >
                  <span className="size-2 rounded-full" style={{ background: cfg.color }} />
                  <span>{s}</span>
                  <span className="font-mono text-[10px] opacity-80">({count})</span>
                </Button>
              );
            })}
          </div>
        </div>

        <DataTable columns={columns} data={filtered} defaultSort={[{ id: "status", desc: false }]} />
      </div>
    </div>
  );
}
