import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, Area, AreaChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { computeForecastProjections, type ForecastProjection } from "@/lib/inventory/analytics";
import { forecastAccuracy, forecastVsActual } from "@/lib/inventory/data";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import type { ColumnDef } from "@tanstack/react-table";
import { Brain, ChevronLeft, ChevronRight, Target, TrendingUp, Calendar } from "lucide-react";

const GRADE_COLORS = { A: "#10b981", B: "#f59e0b", C: "#f97316", D: "#ef4444" };
const forecastConfig = {
  actual: { label: "Actual Sales" },
  forecast: { label: "Forecast" },
} satisfies ChartConfig;

export default function ForecastDemandView() {
  const { filters } = useInventoryFilters();
  const [selectedSku, setSelectedSku] = useState<string>(forecastAccuracy[0]?.sku_id ?? "");
  const [horizon, setHorizon] = useState<"7" | "30" | "60" | "90">("30");

  const projections = useMemo(() => {
    const all = computeForecastProjections();
    return all.filter((r) => filters.categories.includes(r.category) && filters.abcClasses.includes(r.abc_class));
  }, [filters]);

  const activeProj = projections.find((p) => p.sku_id === selectedSku) ?? projections[0];
  const skuList = projections.map((p) => p.sku_id);

  const navigate = (dir: 1 | -1) => {
    const idx = skuList.indexOf(selectedSku);
    const next = (idx + dir + skuList.length) % skuList.length;
    setSelectedSku(skuList[next]);
  };

  const seriesRaw = forecastVsActual[selectedSku ?? ""] ?? [];
  const activeAcc = forecastAccuracy.find((a) => a.sku_id === selectedSku);

  // Filter chart series to the selected horizon window
  const seriesProcessed = useMemo(() => {
    if (!seriesRaw.length || !activeAcc) return [];
    const mae = activeAcc.best_mae;
    const windowSize = Math.min(seriesRaw.length, Number(horizon));
    const sliced = seriesRaw.slice(-windowSize);
    return sliced.map((pt) => ({
      ...pt,
      upper: Math.round((pt.forecast + mae * 1.96) * 100) / 100,
      lower: Math.max(0, Math.round((pt.forecast - mae * 1.96) * 100) / 100),
    }));
  }, [seriesRaw, activeAcc, horizon]);

  // Grade distribution
  const gradeData = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const p of projections) counts[p.accuracyGrade]++;
    return Object.entries(counts).map(([grade, count]) => ({ grade, count, color: GRADE_COLORS[grade as "A"|"B"|"C"|"D"] }));
  }, [projections]);

  // Dynamic table columns responding to the selected forecast horizon
  const projCols = useMemo<ColumnDef<ForecastProjection, unknown>[]>(() => {
    const hNum = Number(horizon);
    const horizonColor =
      horizon === "7" ? "text-cyan-500 font-semibold" :
      horizon === "30" ? "text-violet-500 font-semibold" :
      horizon === "60" ? "text-amber-500 font-semibold" :
      "text-emerald-500 font-semibold";

    return [
      { accessorKey: "sku_id", header: "SKU" },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "abc_class",
        header: "Class",
        cell: ({ getValue }) => <Badge variant="outline" className="font-mono text-xs">{getValue() as string}</Badge>,
      },
      {
        accessorKey: "accuracyGrade",
        header: "Accuracy Grade",
        cell: ({ getValue }) => {
          const g = getValue() as string;
          return <Badge className="font-bold" style={{ background: GRADE_COLORS[g as "A"|"B"|"C"|"D"], color: "white" }}>Grade {g}</Badge>;
        },
      },
      { accessorKey: "mape", header: "MAPE %", cell: ({ getValue }) => <span className="font-mono">{getValue() as number}%</span> },
      { accessorKey: "mae", header: "MAE", cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span> },
      { accessorKey: "avgDailyDemand", header: "Avg Demand", cell: ({ getValue }) => <span className="font-mono">{getValue() as number} u/d</span> },
      {
        id: "selectedForecast",
        header: `${horizon}-Day Forecast`,
        accessorFn: (row) => {
          if (horizon === "7") return row.forecast7d;
          if (horizon === "30") return row.forecast30d;
          if (horizon === "60") return row.forecast60d;
          return row.forecast90d;
        },
        cell: ({ getValue }) => (
          <span className={`font-mono ${horizonColor}`}>
            {(getValue() as number).toLocaleString()}
          </span>
        ),
      },
      {
        id: "lowerBound",
        header: `${horizon}d Lower Bound`,
        accessorFn: (row) => Math.max(0, Math.round((row.avgDailyDemand - row.mae * 1.96) * hNum)),
        cell: ({ getValue }) => <span className="font-mono text-muted-foreground">{(getValue() as number).toLocaleString()}</span>,
      },
      {
        id: "upperBound",
        header: `${horizon}d Upper Bound`,
        accessorFn: (row) => Math.round((row.avgDailyDemand + row.mae * 1.96) * hNum),
        cell: ({ getValue }) => <span className="font-mono text-muted-foreground">{(getValue() as number).toLocaleString()}</span>,
      },
      {
        id: "confidenceInterval",
        header: `${horizon}d 95% CI Range`,
        accessorFn: (row) => {
          const lower = Math.max(0, Math.round((row.avgDailyDemand - row.mae * 1.96) * hNum));
          const upper = Math.round((row.avgDailyDemand + row.mae * 1.96) * hNum);
          return `${lower.toLocaleString()} – ${upper.toLocaleString()}`;
        },
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40">
            {getValue() as string}
          </span>
        ),
      },
    ];
  }, [horizon]);

  // Total portfolio volume for the selected horizon
  const totalHorizonVolume = useMemo(() => {
    return Math.round(
      projections.reduce((sum, p) => {
        const val =
          horizon === "7" ? p.forecast7d :
          horizon === "30" ? p.forecast30d :
          horizon === "60" ? p.forecast60d :
          p.forecast90d;
        return sum + val;
      }, 0)
    );
  }, [projections, horizon]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Demand Forecast & Projections"
        subtitle="7/30/60/90-day demand forecasts from backtested models — actual vs. predicted, confidence intervals, and accuracy grading."
      />
      <InventoryFilterBar />

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "SKUs with Forecasts", value: projections.length, icon: <Brain className="size-5 text-primary" />, sub: "Backtested per-SKU" },
          { label: "Grade A Accuracy", value: gradeData.find(g => g.grade === "A")?.count ?? 0, icon: <Target className="size-5 text-emerald-500" />, sub: "MAPE < 15%" },
          { label: "Avg Forecast MAPE", value: `${Math.round((projections.reduce((s, p) => s + p.mape, 0) / (projections.length || 1)) * 10) / 10}%`, icon: <TrendingUp className="size-5 text-amber-500" />, sub: "Lower is better" },
          { label: `${horizon}-Day Volume`, value: totalHorizonVolume.toLocaleString(), icon: <Calendar className="size-5 text-cyan-500" />, sub: `Portfolio ${horizon}d forecast` },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card/70 backdrop-blur-md border-border/80">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <h3 className="text-2xl font-extrabold mt-0.5 text-foreground">{kpi.value}</h3>
                <span className="text-[10px] text-muted-foreground">{kpi.sub}</span>
              </div>
              {kpi.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accuracy Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <SectionHeader title="Accuracy Grade Distribution" aside="A=<15%, B=<25%, C=<40%, D=>40% MAPE" />
          <Card className="bg-card/70 backdrop-blur-md">
            <CardContent className="pt-4">
              <ChartContainer config={{ count: { label: "SKUs" } }} className="h-[220px] w-full">
                <BarChart data={gradeData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis dataKey="grade" tickFormatter={(v) => `Grade ${v}`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {gradeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Forecast vs Actual Explorer */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              title={`Forecast vs. Actual Explorer (${horizon}d)`}
              aside={`Last ${Math.min(seriesRaw.length, Number(horizon))} days backtesting window`}
            />
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="size-7" onClick={() => navigate(-1)}><ChevronLeft className="size-4" /></Button>
              <Select value={selectedSku} onValueChange={(val) => { if (val) setSelectedSku(val); }}>
                <SelectTrigger className="h-7 text-xs w-52"><SelectValue /></SelectTrigger>
                <SelectContent>{skuList.slice(0, 50).map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" variant="outline" className="size-7" onClick={() => navigate(1)}><ChevronRight className="size-4" /></Button>
            </div>
          </div>
          <Card className="bg-card/70 backdrop-blur-md">
            <CardContent className="pt-3">
              {activeProj && (
                <div className="flex gap-2 flex-wrap items-center mb-3">
                  <Badge variant="outline" className="text-xs">MAPE: {activeProj.mape}%</Badge>
                  <Badge className="text-xs" style={{ background: GRADE_COLORS[activeProj.accuracyGrade], color: "white" }}>Grade {activeProj.accuracyGrade}</Badge>
                  <span className="text-[11px] text-muted-foreground ml-1 mr-0.5">Horizon:</span>
                  {(["7", "30", "60", "90"] as const).map((h) => {
                    const val =
                      h === "7" ? activeProj.forecast7d :
                      h === "30" ? activeProj.forecast30d :
                      h === "60" ? activeProj.forecast60d :
                      activeProj.forecast90d;
                    const isSelected = horizon === h;
                    const colorClasses =
                      h === "7" ? "text-cyan-500 border-cyan-500/40" :
                      h === "30" ? "text-violet-500 border-violet-500/40" :
                      h === "60" ? "text-amber-500 border-amber-500/40" :
                      "text-emerald-500 border-emerald-500/40";
                    return (
                      <Badge
                        key={h}
                        variant={isSelected ? "default" : "outline"}
                        className={`text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "font-bold ring-2 ring-primary/40 shadow-sm"
                            : `${colorClasses} hover:bg-muted/50`
                        }`}
                        onClick={() => setHorizon(h)}
                      >
                        {h}d: {val.toLocaleString()}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <ChartContainer config={forecastConfig} className="h-[200px] w-full">
                <AreaChart data={seriesProcessed} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="actual" stroke="#64748b" fill="url(#actualGrad)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="forecast" stroke="#06b6d4" fill="url(#forecastGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Horizon Selector + Projections Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionHeader
            title="Demand Projection Directory"
            aside={`SKU-level ${horizon}-day demand forecast with 95% confidence bounds`}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Forecast Horizon:</span>
            <div className="flex gap-1 bg-muted/70 p-1 rounded-lg border border-border/50 text-xs">
              {(["7", "30", "60", "90"] as const).map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant={horizon === h ? "default" : "ghost"}
                  className="h-6 text-[11px] px-2.5 rounded font-medium transition-all"
                  onClick={() => setHorizon(h)}
                >
                  {h}d
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DataTable columns={projCols} data={projections} defaultSort={[{ id: "mape", desc: false }]} />
      </div>
    </div>
  );
}
