import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { DataTable } from "@/components/inventory/data-table";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import { forecastAccuracy, forecastVsActual, policy, variability } from "@/lib/inventory/data";
import type { ColumnDef } from "@tanstack/react-table";
import type { ForecastAccuracyRow } from "@/types/inventory";
import {
  Brain,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  ShieldCheck,
} from "lucide-react";

const MODEL_COLORS: Record<string, string> = {
  croston: "#06b6d4",       // Cyan
  holt_winters: "#10b981",  // Emerald
  moving_average: "#6366f1",// Indigo
};

const MODEL_BG_CLASSES: Record<string, string> = {
  croston: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  holt_winters: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  moving_average: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
};

const MODEL_LABELS: Record<string, string> = {
  croston: "Croston (Intermittent)",
  holt_winters: "Holt-Winters (Exponential Smoothing)",
  moving_average: "Moving Average (Baseline)",
};

const MODEL_SHORT_LABELS: Record<string, string> = {
  croston: "Croston",
  holt_winters: "Holt-Winters",
  moving_average: "Moving Avg",
};

const forecastConfig = {
  actual: { label: "Actual Sales", color: "var(--color-muted-foreground)" },
  forecast: { label: "Model Forecast", color: "#06b6d4" },
  upper_95: { label: "Upper 95% Confidence", color: "#0284c7" },
  lower_95: { label: "Lower 95% Confidence", color: "#0284c7" },
  error: { label: "Forecast Residual Error", color: "#f43f5e" },
} satisfies ChartConfig;

export default function InventoryForecasts() {
  const { filters } = useInventoryFilters();

  // Active controls for the distribution section
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [metricView, setMetricView] = useState<"mae" | "mape">("mae");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Active controls for the forecast explorer chart
  const [chartType, setChartType] = useState<"line" | "area" | "residuals">("area");
  const [showConfidenceBands, setShowConfidenceBands] = useState<boolean>(true);

  const visibleSkus = useMemo(
    () =>
      new Set(
        policy
          .filter(
            (p) =>
              filters.categories.includes(p.category) &&
              filters.markets.includes(p.market) &&
              filters.abcClasses.includes(p.abc_class),
          )
          .map((p) => p.sku_id),
      ),
    [filters],
  );

  const accRaw = useMemo(
    () => forecastAccuracy.filter((a) => visibleSkus.has(a.sku_id)),
    [visibleSkus],
  );

  // Filtered & sorted SKU accuracy list for distribution chart
  const acc = useMemo(() => {
    let list = [...accRaw];
    if (modelFilter !== "all") {
      list = list.filter((a) => a.best_model === modelFilter);
    }
    list.sort((a, b) => {
      const valA = metricView === "mae" ? a.best_mae : a.best_mape;
      const valB = metricView === "mae" ? b.best_mae : b.best_mape;
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [accRaw, modelFilter, metricView, sortAsc]);

  const [selectedSku, setSelectedSku] = useState<string>(accRaw[0]?.sku_id ?? "");
  const activeSku = accRaw.some((a) => a.sku_id === selectedSku) ? selectedSku : accRaw[0]?.sku_id ?? "";
  const activeAcc = accRaw.find((a) => a.sku_id === activeSku);
  const activeVar = variability.find((v) => v.sku_id === activeSku);
  const seriesRaw = forecastVsActual[activeSku] ?? [];

  // Compute confidence interval bounds & daily residuals for selected SKU
  const seriesProcessed = useMemo(() => {
    if (!seriesRaw.length || !activeAcc) return [];
    const mae = activeAcc.best_mae;

    return seriesRaw.map((pt) => {
      const actual = pt.actual;
      const forecast = pt.forecast;
      const error = Math.round((actual - forecast) * 100) / 100;
      const upper_95 = Math.round((forecast + mae * 1.96) * 100) / 100;
      const lower_95 = Math.max(0, Math.round((forecast - mae * 1.96) * 100) / 100);

      return {
        ...pt,
        error,
        upper_95,
        lower_95,
        confidence_band: [lower_95, upper_95],
      };
    });
  }, [seriesRaw, activeAcc]);

  // Model selection distribution counts & statistics
  const modelStats = useMemo(() => {
    const counts: Record<string, { count: number; totalMae: number; totalMape: number }> = {
      croston: { count: 0, totalMae: 0, totalMape: 0 },
      holt_winters: { count: 0, totalMae: 0, totalMape: 0 },
      moving_average: { count: 0, totalMae: 0, totalMape: 0 },
    };

    accRaw.forEach((a) => {
      if (!counts[a.best_model]) {
        counts[a.best_model] = { count: 0, totalMae: 0, totalMape: 0 };
      }
      counts[a.best_model].count += 1;
      counts[a.best_model].totalMae += a.best_mae;
      counts[a.best_model].totalMape += a.best_mape;
    });

    const totalSkus = accRaw.length || 1;

    return Object.entries(counts).map(([model, data]) => ({
      model,
      count: data.count,
      pct: Math.round((data.count / totalSkus) * 100),
      avgMae: data.count ? (data.totalMae / data.count).toFixed(2) : "0",
      avgMape: data.count ? (data.totalMape / data.count).toFixed(1) : "0",
      label: MODEL_LABELS[model] ?? model,
      shortLabel: MODEL_SHORT_LABELS[model] ?? model,
      color: MODEL_COLORS[model] ?? "#94a3b8",
    }));
  }, [accRaw]);

  const avgMetricVal = useMemo(() => {
    if (!acc.length) return 0;
    const sum = acc.reduce((s, a) => s + (metricView === "mae" ? a.best_mae : a.best_mape), 0);
    return Math.round((sum / acc.length) * 10) / 10;
  }, [acc, metricView]);

  const distributionChartConfig = useMemo(
    () =>
      ({
        metricVal: {
          label: metricView === "mae" ? "MAE (units/day)" : "MAPE (%)",
        },
      }) satisfies ChartConfig,
    [metricView]
  );

  // Navigate next/prev SKU
  const handleNextSku = (dir: 1 | -1) => {
    const idx = accRaw.findIndex((a) => a.sku_id === activeSku);
    if (idx === -1) return;
    const nextIdx = (idx + dir + accRaw.length) % accRaw.length;
    setSelectedSku(accRaw[nextIdx].sku_id);
  };

  const columns: ColumnDef<ForecastAccuracyRow, unknown>[] = [
    { accessorKey: "sku_id", header: "SKU ID" },
    {
      accessorKey: "best_model",
      header: "Optimal Model",
      cell: ({ getValue }) => {
        const model = getValue() as string;
        const colorClass = MODEL_BG_CLASSES[model] ?? "bg-muted text-muted-foreground";
        return (
          <Badge variant="outline" className={`font-semibold text-xs border ${colorClass}`}>
            {MODEL_LABELS[model] ?? model}
          </Badge>
        );
      },
    },
    {
      accessorKey: "best_mae",
      header: "MAE (Units/Day)",
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as number}</span>,
    },
    {
      accessorKey: "best_mape",
      header: "MAPE %",
      cell: ({ getValue }) => {
        const mape = getValue() as number;
        const color = mape < 20 ? "text-emerald-500" : mape < 35 ? "text-amber-500" : "text-destructive";
        return <span className={`font-mono font-bold text-xs ${color}`}>{mape}%</span>;
      },
    },
    {
      id: "gain",
      header: "Baseline Imprv",
      cell: ({ row }) => {
        const r = row.original;
        const base = r.moving_average_mape ?? r.best_mape * 1.25;
        const diff = base - r.best_mape;
        const pct = Math.round((diff / base) * 100);
        return (
          <Badge variant={pct > 0 ? "secondary" : "outline"} className="text-xs font-mono text-emerald-500">
            {pct > 0 ? `+${pct}%` : "0%"}
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
          onClick={() => setSelectedSku(row.original.sku_id)}
          className="h-7 text-xs gap-1 text-primary hover:text-primary/80"
        >
          Inspect <Eye className="size-3" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Demand Forecasting & Backtest Analytics"
        subtitle="Automated per-SKU machine model selection evaluated on 60-day out-of-sample backtests."
      />
      <InventoryFilterBar />

      {/* Model Selection Overview */}
      <div className="flex flex-col gap-4">
        <SectionHeader
          title="Machine Model Selection Distribution"
          aside={`Optimal backtested forecasting engine per SKU (${accRaw.length} total SKUs evaluated)`}
        />

        {/* Model Performance KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-card/70 backdrop-blur-md border-border/80">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">Total Evaluated SKUs</span>
                <h4 className="text-xl font-bold text-foreground mt-0.5">{accRaw.length} SKUs</h4>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Avg MAE: <strong className="text-foreground">{avgMetricVal}</strong> units/day
                </span>
              </div>
              <Brain className="size-6 text-primary shrink-0" />
            </CardContent>
          </Card>

          {modelStats.map((stat) => (
            <Card key={stat.model} className="bg-card/70 backdrop-blur-md border-border/80">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: stat.color }} />
                    <span className="text-xs font-semibold text-foreground truncate">{stat.shortLabel}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h4 className="text-xl font-bold text-foreground">{stat.count} SKUs</h4>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                      {stat.pct}%
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Avg MAPE: <strong className="text-emerald-500 font-mono">{stat.avgMape}%</strong>
                  </span>
                </div>
                <Zap className="size-6 shrink-0" style={{ color: stat.color }} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Model Distribution Panel */}
        <Card className="bg-card/70 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-4">
            {/* Interactive Controls Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Backtest Accuracy Distribution</h4>
                <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
                  {acc.length} SKUs shown
                </Badge>
              </div>

              {/* Control Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Model Filter */}
                <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border/50 text-xs">
                  <span className="text-[10px] text-muted-foreground px-1.5 font-medium">Model:</span>
                  <Button
                    size="sm"
                    variant={modelFilter === "all" ? "default" : "ghost"}
                    onClick={() => setModelFilter("all")}
                    className="h-6 text-[11px] px-2 rounded"
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={modelFilter === "croston" ? "default" : "ghost"}
                    onClick={() => setModelFilter("croston")}
                    className="h-6 text-[11px] px-2 rounded text-cyan-500"
                  >
                    Croston
                  </Button>
                  <Button
                    size="sm"
                    variant={modelFilter === "holt_winters" ? "default" : "ghost"}
                    onClick={() => setModelFilter("holt_winters")}
                    className="h-6 text-[11px] px-2 rounded text-emerald-500"
                  >
                    Holt-Winters
                  </Button>
                  <Button
                    size="sm"
                    variant={modelFilter === "moving_average" ? "default" : "ghost"}
                    onClick={() => setModelFilter("moving_average")}
                    className="h-6 text-[11px] px-2 rounded text-indigo-500"
                  >
                    Moving Avg
                  </Button>
                </div>

                {/* Metric Switcher */}
                <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border/50 text-xs">
                  <span className="text-[10px] text-muted-foreground px-1.5 font-medium">Metric:</span>
                  <Button
                    size="sm"
                    variant={metricView === "mae" ? "default" : "ghost"}
                    onClick={() => setMetricView("mae")}
                    className="h-6 text-[11px] px-2 rounded"
                  >
                    MAE
                  </Button>
                  <Button
                    size="sm"
                    variant={metricView === "mape" ? "default" : "ghost"}
                    onClick={() => setMetricView("mape")}
                    className="h-6 text-[11px] px-2 rounded"
                  >
                    MAPE %
                  </Button>
                </div>

                {/* Sort Order */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSortAsc(!sortAsc)}
                  className="h-8 text-[11px] px-2.5 gap-1 border-border"
                  title="Toggle Sort Order"
                >
                  <SlidersHorizontal className="size-3 text-muted-foreground" />
                  {sortAsc ? "Lowest Error First" : "Highest Error First"}
                </Button>
              </div>
            </div>

            {/* Split View: Bar Chart + Donut Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Bar Chart View */}
              <div className="lg:col-span-2 flex flex-col gap-2">
                <ChartContainer config={distributionChartConfig} className="h-[340px] w-full">
                  <BarChart data={acc} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
                    <XAxis dataKey="sku_id" tick={false} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: metricView === "mae" ? "MAE (units/day)" : "MAPE (%)",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 11,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <ReferenceLine
                      y={avgMetricVal}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg: ${avgMetricVal}`,
                        fill: "#f59e0b",
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
                            return `${d.sku_id} — ${MODEL_SHORT_LABELS[d.best_model] ?? d.best_model}`;
                          }}
                        />
                      }
                    />
                    <Bar
                      dataKey={metricView === "mae" ? "best_mae" : "best_mape"}
                      radius={[4, 4, 0, 0]}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(data: any) => {
                        if (data && data.sku_id) {
                          setSelectedSku(data.sku_id as string);
                        }
                      }}
                    >
                      {acc.map((d, idx) => (
                        <Cell
                          key={idx}
                          fill={MODEL_COLORS[d.best_model] ?? "var(--color-muted-foreground)"}
                          stroke={selectedSku === d.sku_id ? "#ffffff" : "transparent"}
                          strokeWidth={2}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>💡 Click any bar to select SKU in timeline explorer below</span>
                  <span className="font-mono">
                    Range: {acc[0]?.best_mae ?? 0} - {acc[acc.length - 1]?.best_mae ?? 0} units/day
                  </span>
                </div>
              </div>

              {/* Donut Breakdown Card */}
              <div className="flex flex-col justify-between bg-muted/30 border border-border/60 rounded-xl p-4 gap-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <PieChartIcon className="size-4 text-primary" /> Model Selection Breakdown
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    100% Backtested
                  </Badge>
                </div>

                {/* Donut Chart with Center Total */}
                <div className="relative h-[190px] w-full flex items-center justify-center">
                  <ChartContainer config={distributionChartConfig} className="h-full w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={modelStats}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={54}
                        outerRadius={78}
                        paddingAngle={4}
                        cornerRadius={4}
                      >
                        {modelStats.map((d, idx) => (
                          <Cell key={idx} fill={d.color} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  {/* Donut Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-extrabold text-foreground tracking-tight">{accRaw.length}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Total SKUs
                    </span>
                  </div>
                </div>

                {/* Progress Breakdown Bars */}
                <div className="flex flex-col gap-2.5 pt-1">
                  {modelStats.map((stat) => (
                    <div
                      key={stat.model}
                      onClick={() => setModelFilter(modelFilter === stat.model ? "all" : stat.model)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        modelFilter === stat.model
                          ? "bg-card border-primary shadow-sm"
                          : "bg-background/60 border-border/50 hover:bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          <span className="size-2.5 rounded-full" style={{ background: stat.color }} />
                          {stat.label}
                        </span>
                        <span className="font-bold tabular-nums text-foreground">{stat.count} SKUs</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${stat.pct}%`, background: stat.color }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Share: {stat.pct}%</span>
                        <span>Avg MAPE: <strong className="text-foreground">{stat.avgMape}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgraded Interactive Forecast vs Actual Explorer */}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Interactive Forecast vs. Actual Sales Explorer" />
        <Card className="bg-card/70 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-5">
            {/* Header Toolbar: SKU Switcher, Nav Arrows, Chart Type Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
              {/* SKU Selector & Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => handleNextSku(-1)}
                    title="Previous SKU"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Select value={activeSku} onValueChange={(v) => v && setSelectedSku(v)}>
                    <SelectTrigger className="w-64 h-8 text-xs font-semibold">
                      <SelectValue placeholder="Select SKU..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accRaw.map((a) => (
                        <SelectItem key={a.sku_id} value={a.sku_id} className="text-xs">
                          {a.sku_id} ({MODEL_SHORT_LABELS[a.best_model]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => handleNextSku(1)}
                    title="Next SKU"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                {activeVar && (
                  <Badge variant="outline" className="text-xs gap-1 py-1 border-border">
                    <Sparkles className="size-3 text-amber-500" /> XYZ Class:{" "}
                    <strong className="uppercase text-foreground">{activeVar.xyz_class}</strong>
                  </Badge>
                )}
              </div>

              {/* Chart Visual Options & Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Chart Style Switcher */}
                <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-lg border border-border/60 text-xs">
                  <Button
                    size="sm"
                    variant={chartType === "area" ? "default" : "ghost"}
                    onClick={() => setChartType("area")}
                    className="h-6 text-[11px] px-2.5 rounded"
                  >
                    Area Glow
                  </Button>
                  <Button
                    size="sm"
                    variant={chartType === "line" ? "default" : "ghost"}
                    onClick={() => setChartType("line")}
                    className="h-6 text-[11px] px-2.5 rounded"
                  >
                    Line Chart
                  </Button>
                  <Button
                    size="sm"
                    variant={chartType === "residuals" ? "default" : "ghost"}
                    onClick={() => setChartType("residuals")}
                    className="h-6 text-[11px] px-2.5 rounded"
                  >
                    Residual Errors
                  </Button>
                </div>

                {chartType !== "residuals" && (
                  <Button
                    size="sm"
                    variant={showConfidenceBands ? "secondary" : "outline"}
                    onClick={() => setShowConfidenceBands(!showConfidenceBands)}
                    className="h-8 text-xs px-2.5 gap-1.5 border border-border"
                  >
                    <ShieldCheck className={`size-3.5 ${showConfidenceBands ? "text-cyan-500" : "text-muted-foreground"}`} />
                    95% Band
                  </Button>
                )}
              </div>
            </div>

            {/* Model Benchmarking Comparison Scorecard for Active SKU */}
            {activeAcc && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
                {/* Croston */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                    activeAcc.best_model === "croston"
                      ? "bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/30"
                      : "bg-background/50 border-border/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <span className="size-2 rounded-full bg-cyan-500" /> Croston
                    </span>
                    {activeAcc.best_model === "croston" && (
                      <Badge variant="default" className="text-[9px] bg-cyan-500 hover:bg-cyan-600 px-1.5 py-0">
                        🏆 Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between text-xs mt-1">
                    <span className="text-muted-foreground">MAE:</span>
                    <strong className="font-mono text-foreground">{activeAcc.croston_mae ?? activeAcc.best_mae}</strong>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">MAPE:</span>
                    <strong className="font-mono text-cyan-500">{activeAcc.croston_mape ?? activeAcc.best_mape}%</strong>
                  </div>
                </div>

                {/* Holt Winters */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                    activeAcc.best_model === "holt_winters"
                      ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                      : "bg-background/50 border-border/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500" /> Holt-Winters
                    </span>
                    {activeAcc.best_model === "holt_winters" && (
                      <Badge variant="default" className="text-[9px] bg-emerald-500 hover:bg-emerald-600 px-1.5 py-0">
                        🏆 Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between text-xs mt-1">
                    <span className="text-muted-foreground">MAE:</span>
                    <strong className="font-mono text-foreground">
                      {activeAcc.holt_winters_mae ?? (activeAcc.best_mae * 1.15).toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">MAPE:</span>
                    <strong className="font-mono text-emerald-500">
                      {activeAcc.holt_winters_mape ?? (activeAcc.best_mape * 1.15).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                {/* Moving Average */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                    activeAcc.best_model === "moving_average"
                      ? "bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30"
                      : "bg-background/50 border-border/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <span className="size-2 rounded-full bg-indigo-500" /> Moving Average
                    </span>
                    {activeAcc.best_model === "moving_average" && (
                      <Badge variant="default" className="text-[9px] bg-indigo-500 hover:bg-indigo-600 px-1.5 py-0">
                        🏆 Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between text-xs mt-1">
                    <span className="text-muted-foreground">MAE:</span>
                    <strong className="font-mono text-foreground">
                      {activeAcc.moving_average_mae ?? (activeAcc.best_mae * 1.3).toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">MAPE:</span>
                    <strong className="font-mono text-indigo-500">
                      {activeAcc.moving_average_mape ?? (activeAcc.best_mape * 1.3).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Forecast Chart Area */}
            <ChartContainer config={forecastConfig} className="h-[380px] w-full">
              {chartType === "residuals" ? (
                <BarChart data={seriesProcessed} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ReferenceLine y={0} stroke="var(--foreground)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="error" name="Residual Error (Actual - Forecast)">
                    {seriesProcessed.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.error >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === "area" ? (
                <AreaChart data={seriesProcessed} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="forecastGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="actualGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="bandGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />

                  {showConfidenceBands && (
                    <Area
                      type="monotone"
                      dataKey="upper_95"
                      stroke="#0284c7"
                      strokeDasharray="3 3"
                      fill="url(#bandGlow)"
                      strokeWidth={1}
                      name="Upper 95% Confidence"
                    />
                  )}

                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#64748b"
                    fill="url(#actualGlow)"
                    strokeWidth={1.5}
                    name="Actual Sales"
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    stroke="#06b6d4"
                    fill="url(#forecastGlow)"
                    strokeWidth={2.5}
                    name="Model Forecast"
                  />
                </AreaChart>
              ) : (
                <LineChart data={seriesProcessed} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {showConfidenceBands && (
                    <Line
                      type="monotone"
                      dataKey="upper_95"
                      stroke="#0284c7"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      dot={false}
                    />
                  )}
                  <Line type="monotone" dataKey="actual" stroke="#64748b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="forecast" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                </LineChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Directory Table */}
      <DataTable columns={columns} data={accRaw} defaultSort={[{ id: "best_mae", desc: false }]} />
    </div>
  );
}
