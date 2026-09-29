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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { computeWarehouseStats, type WarehouseStats } from "@/lib/inventory/analytics";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  AlertTriangle,
  TrendingUp,
  Package,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react";

function fmtUsd(v: number): string {
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtCompactUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toLocaleString("en-US")}`;
}

const columns: ColumnDef<WarehouseStats, unknown>[] = [
  {
    accessorKey: "market",
    header: "Market / Warehouse",
    cell: ({ getValue }) => <span className="font-bold text-foreground">{getValue() as string} Hub</span>,
  },
  {
    accessorKey: "skuCount",
    header: "SKUs",
    cell: ({ getValue }) => <span className="font-mono">{(getValue() as number).toLocaleString("en-US")}</span>,
  },
  {
    accessorKey: "totalStockOnHand",
    header: "Stock On Hand",
    cell: ({ getValue }) => <span className="font-mono font-medium">{(getValue() as number).toLocaleString("en-US")}</span>,
  },
  {
    accessorKey: "totalSafetyStock",
    header: "Safety Stock",
    cell: ({ getValue }) => <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">{(getValue() as number).toLocaleString("en-US")}</span>,
  },
  {
    accessorKey: "utilizationPct",
    header: "Utilization",
    cell: ({ getValue }) => {
      const v = getValue() as number;
      const color = v >= 75 ? "text-emerald-600 dark:text-emerald-400" : v >= 35 ? "text-amber-600 dark:text-amber-400" : "text-destructive";
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${v}%`, background: v >= 75 ? "#10b981" : v >= 35 ? "#f59e0b" : "#ef4444" }}
            />
          </div>
          <span className={`font-mono text-xs font-semibold ${color}`}>{v}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "inventoryValue",
    header: "Inventory Value",
    cell: ({ getValue }) => <span className="font-mono font-bold text-foreground">{fmtUsd(getValue() as number)}</span>,
  },
  {
    accessorKey: "redAlerts",
    header: "Critical Alerts",
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return v > 0 ? (
        <Badge variant="outline" className="text-xs font-semibold font-mono border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 gap-1">
          <AlertTriangle className="size-3" /> {v} Critical
        </Badge>
      ) : (
        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold">
          Optimal
        </Badge>
      );
    },
  },
  {
    accessorKey: "overstockCount",
    header: "Overstock",
    cell: ({ getValue }) => <span className="font-mono text-violet-600 dark:text-violet-400">{getValue() as number}</span>,
  },
  {
    accessorKey: "understockCount",
    header: "Understock",
    cell: ({ getValue }) => <span className="font-mono text-amber-600 dark:text-amber-400">{getValue() as number}</span>,
  },
  {
    accessorKey: "totalHoldingCost",
    header: "Holding Cost",
    cell: ({ getValue }) => <span className="font-mono">{fmtUsd(getValue() as number)}</span>,
  },
  {
    accessorKey: "totalRevenue",
    header: "Annual Revenue",
    cell: ({ getValue }) => <span className="font-mono font-bold text-foreground">{fmtUsd(getValue() as number)}</span>,
  },
];

export default function WarehouseAnalysisView() {
  const warehouses = useMemo(() => computeWarehouseStats(), []);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  const totalValue = warehouses.reduce((s, w) => s + w.inventoryValue, 0);
  const totalRedAlerts = warehouses.reduce((s, w) => s + w.redAlerts, 0);
  const mostCritical = [...warehouses].sort((a, b) => b.redAlerts - a.redAlerts)[0];
  const mostOverstocked = [...warehouses].sort((a, b) => b.overstockCount - a.overstockCount)[0];

  const displayedWarehouses = useMemo(() => {
    if (!selectedMarket) return warehouses;
    return warehouses.filter((w) => w.market === selectedMarket);
  }, [warehouses, selectedMarket]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Warehouse Analysis"
        subtitle="Market-level inventory distribution, stock utilization, alert status, and value concentration across global fulfillment hubs."
      />
      <InventoryFilterBar />

      {/* Classical Executive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Regional Hubs",
            value: warehouses.length,
            icon: <Building2 className="size-5 text-primary" />,
            sub: "Active distribution centers",
          },
          {
            label: "Total Inventory Value",
            value: fmtUsd(Math.round(totalValue)),
            icon: <Package className="size-5 text-sky-500" />,
            sub: "Aggregate stock on hand",
          },
          {
            label: "Critical Alerts",
            value: `${totalRedAlerts} Alerts`,
            icon: <AlertTriangle className="size-5 text-rose-500" />,
            sub: mostCritical ? `Worst: ${mostCritical.market} Hub` : "Optimal",
            color: "text-rose-600 dark:text-rose-400",
          },
          {
            label: "Highest Overstock",
            value: mostOverstocked?.market ? `${mostOverstocked.market} Hub` : "—",
            icon: <TrendingUp className="size-5 text-violet-500" />,
            sub: `${mostOverstocked?.overstockCount ?? 0} SKUs exceeding max threshold`,
            color: "text-violet-600 dark:text-violet-400",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card border border-border/80 rounded-xl shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">{kpi.label}</span>
                <h3 className={`text-xl font-bold font-mono tracking-tight mt-0.5 ${kpi.color ?? "text-foreground"}`}>
                  {kpi.value}
                </h3>
                <span className="text-[10px] text-muted-foreground/80">{kpi.sub}</span>
              </div>
              <div className="size-10 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center shrink-0">
                {kpi.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Classical Warehouse Status Overview Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <SectionHeader
            title="Warehouse Status Overview"
            aside="Regional distribution center performance, buffer capacity, and stock risk"
          />
          {selectedMarket && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedMarket(null)}
              className="h-7 text-xs gap-1.5 self-start sm:self-auto border-border/80 cursor-pointer"
            >
              <span>Selected: {selectedMarket} Hub</span>
              <X className="size-3" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {warehouses.map((w) => {
            const isSelected = selectedMarket === w.market;
            const isCritical = w.redAlerts > 0;

            return (
              <Card
                key={w.market}
                onClick={() => setSelectedMarket(isSelected ? null : w.market)}
                className={`bg-card border rounded-xl transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between select-none ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border/80 hover:border-border hover:shadow-xs"
                }`}
              >
                {/* Card Header */}
                <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-border/50 bg-muted/15">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                      <Building2 className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground tracking-tight truncate flex items-center gap-1.5">
                        <span>{w.market} Hub</span>
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono">{w.skuCount} SKUs Monitored</p>
                    </div>
                  </div>

                  <div>
                    {isCritical ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold font-mono border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 gap-1 px-2 py-0.5"
                      >
                        <AlertTriangle className="size-3" />
                        <span>{w.redAlerts} Critical</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 px-2 py-0.5"
                      >
                        <CheckCircle2 className="size-3" />
                        <span>Optimal</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card Body: Classical 4-Cell Financial Metric Grid */}
                <CardContent className="p-3.5 pt-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Inventory Value & Revenue */}
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 flex flex-col">
                      <span className="text-[10px] font-medium text-muted-foreground">Inventory Value</span>
                      <span className="text-sm font-bold font-mono text-foreground mt-0.5">
                        {fmtUsd(w.inventoryValue)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        Rev: {fmtCompactUsd(w.totalRevenue)}
                      </span>
                    </div>

                    {/* Stock on Hand & Safety Buffer */}
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 flex flex-col">
                      <span className="text-[10px] font-medium text-muted-foreground">Stock on Hand</span>
                      <span className="text-sm font-bold font-mono text-foreground mt-0.5">
                        {w.totalStockOnHand.toLocaleString("en-US")} units
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        Safety: {w.totalSafetyStock.toLocaleString("en-US")} u
                      </span>
                    </div>

                    {/* Understock Risk SKUs */}
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 flex flex-col">
                      <span className="text-[10px] font-medium text-muted-foreground">Understock Risk</span>
                      <span
                        className={`text-sm font-bold font-mono mt-0.5 ${
                          w.understockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        }`}
                      >
                        {w.understockCount} SKUs
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {w.understockCount > 0 ? "Below safety level" : "Buffer protected"}
                      </span>
                    </div>

                    {/* Overstock Capital */}
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 flex flex-col">
                      <span className="text-[10px] font-medium text-muted-foreground">Overstock Excess</span>
                      <span
                        className={`text-sm font-bold font-mono mt-0.5 ${
                          w.overstockCount > 0 ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"
                        }`}
                      >
                        {w.overstockCount} SKUs
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        Holding: {fmtUsd(w.totalHoldingCost)}/yr
                      </span>
                    </div>
                  </div>

                  {/* Buffer Utilization Bar */}
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-muted-foreground font-medium">Reorder Buffer Utilization</span>
                      <span className="font-bold text-foreground">{w.utilizationPct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, w.utilizationPct)}%`,
                          background:
                            w.utilizationPct >= 75
                              ? "#10b981"
                              : w.utilizationPct >= 35
                                ? "#f59e0b"
                                : "#ef4444",
                        }}
                      />
                    </div>
                  </div>

                  {/* Clean Alert Breakdown Footer (Replaces broken horizontal sticks) */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] font-mono">
                    <span className="text-muted-foreground">Alert Tiers:</span>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="size-1.5 rounded-full bg-emerald-500 shadow-2xs" />
                        <span>{w.greenAlerts} Normal</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <span className="size-1.5 rounded-full bg-amber-500 shadow-2xs" />
                        <span>{w.yellowAlerts} Warn</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <span className="size-1.5 rounded-full bg-rose-500 shadow-2xs" />
                        <span>{w.redAlerts} Crit</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Stock vs. Reorder Point Comparison Chart */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="Stock vs. Reorder Point by Market"
          aside="Current physical stock on hand compared to target reorder trigger point"
        />
        <Card className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-4 pt-3">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warehouses} margin={{ top: 22, right: 16, bottom: 4, left: -14 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                  <XAxis
                    dataKey="market"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v} Hub`}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as WarehouseStats;
                      return (
                        <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs min-w-[200px]">
                          <div className="font-bold text-foreground pb-1.5 border-b border-border/50 mb-2">
                            {d.market} Distribution Center
                          </div>
                          <div className="flex flex-col gap-1 font-mono text-[11px]">
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Stock On Hand:</span>
                              <span className="font-bold text-sky-600 dark:text-sky-400">{d.totalStockOnHand.toLocaleString("en-US")} units</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Reorder Trigger:</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">{d.totalReorderPoint.toLocaleString("en-US")} units</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Safety Stock:</span>
                              <span className="font-semibold text-foreground">{d.totalSafetyStock.toLocaleString("en-US")} units</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/40">
                              <span>Coverage Ratio:</span>
                              <span className="font-bold text-foreground">{d.utilizationPct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="totalStockOnHand"
                    fill="#0284c7"
                    name="Stock on Hand"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) => {
                      const m = (entry as unknown as { market?: string })?.market;
                      if (m) setSelectedMarket(selectedMarket === m ? null : m);
                    }}
                  >
                    {warehouses.map((w) => (
                      <Cell
                        key={w.market}
                        fill="#0284c7"
                        opacity={!selectedMarket || selectedMarket === w.market ? 1 : 0.25}
                        className="transition-all duration-150 cursor-pointer hover:brightness-110"
                      />
                    ))}
                    <LabelList
                      dataKey="totalStockOnHand"
                      position="top"
                      fill="var(--foreground)"
                      fontSize={11}
                      fontWeight={600}
                      offset={6}
                      formatter={(v: unknown) => `${Number(v).toLocaleString("en-US")}`}
                    />
                  </Bar>
                  <Bar
                    dataKey="totalReorderPoint"
                    fill="#f59e0b"
                    name="Reorder Point"
                    radius={[6, 6, 0, 0]}
                    fillOpacity={0.6}
                    cursor="pointer"
                    onClick={(entry) => {
                      const m = (entry as unknown as { market?: string })?.market;
                      if (m) setSelectedMarket(selectedMarket === m ? null : m);
                    }}
                  >
                    {warehouses.map((w) => (
                      <Cell
                        key={w.market}
                        fill="#f59e0b"
                        opacity={!selectedMarket || selectedMarket === w.market ? 0.6 : 0.15}
                        className="transition-all duration-150 cursor-pointer hover:brightness-110"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Directory Data Table */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <SectionHeader
            title="Warehouse Directory"
            aside={
              selectedMarket
                ? `Filtered by ${selectedMarket} Hub (1 hub displayed)`
                : `All ${warehouses.length} regional warehouse hubs`
            }
          />
          {selectedMarket && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedMarket(null)}
              className="h-7 text-xs gap-1.5 self-start sm:self-auto border-border/80 cursor-pointer"
            >
              <RotateCcw className="size-3" /> Show All Hubs
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          data={displayedWarehouses}
          defaultSort={[{ id: "inventoryValue", desc: true }]}
        />
      </div>
    </div>
  );
}
