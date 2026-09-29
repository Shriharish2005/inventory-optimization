import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { KpiLedger } from "@/components/inventory/kpi-ledger";
import { SectionHeader } from "@/components/inventory/section-header";
import { SkuDrawer } from "@/components/inventory/sku-drawer";
import { SimpleMarkdown } from "@/lib/inventory/markdown";
import { useInventoryFilters } from "@/context/inventory/FilterContext";
import {
  filterSimulationResults,
  sensitivity,
  summary,
  executiveSummary,
} from "@/lib/inventory/data";
import { ShieldCheck, Award } from "lucide-react";

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

const sensitivityConfig = {
  total_holding_cost: { label: "Holding cost", color: "var(--color-chart-3)" },
  est_lost_sales_value: { label: "Lost-sale value", color: "var(--color-destructive)" },
  total_cost_of_policy: { label: "Total cost", color: "var(--color-foreground)" },
} satisfies ChartConfig;

const impactConfig = {
  net_dollar_impact: { label: "Net $ impact" },
} satisfies ChartConfig;

export default function InventoryOverview() {
  const { filters, isFiltered } = useInventoryFilters();
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const results = filterSimulationResults(filters);

  const agg = useMemo(() => {
    if (!isFiltered) {
      return {
        avoided: summary.stockout_days_avoided,
        pctReduction: summary.pct_stockout_reduction,
        holdDelta: summary.total_holding_cost_delta,
        lostAvoided: summary.est_lost_sales_avoided_value,
        net: summary.net_dollar_impact,
      };
    }
    const soNaive = results.reduce((s, r) => s + r.naive_stockout_days, 0);
    const soOpt = results.reduce((s, r) => s + r.optimized_stockout_days, 0);
    const avoided = soNaive - soOpt;
    return {
      avoided,
      pctReduction: soNaive ? (100 * avoided) / soNaive : 0,
      holdDelta: results.reduce((s, r) => s + r.holding_cost_delta, 0),
      lostAvoided: results.reduce((s, r) => s + r.est_lost_sales_avoided_value, 0),
      net: results.reduce((s, r) => s + r.net_dollar_impact, 0),
    };
  }, [results, isFiltered]);

  const bestServiceLevel = useMemo(
    () => sensitivity.reduce((best, p) => (p.total_cost_of_policy < best.total_cost_of_policy ? p : best), sensitivity[0]),
    [],
  );

  const sensitivityChartData = sensitivity.map((p) => ({
    ...p,
    service_level_pct: Math.round(p.service_level_target * 100),
  }));

  const impactData = useMemo(() => {
    const sorted = [...results].sort((a, b) => b.net_dollar_impact - a.net_dollar_impact);
    const top = sorted.slice(0, 14);
    const bottom = sorted.slice(-5);
    const seen = new Set<string>();
    const combined = [...top, ...bottom].filter((r) => {
      if (seen.has(r.sku_id)) return false;
      seen.add(r.sku_id);
      return true;
    });
    return combined
      .sort((a, b) => a.net_dollar_impact - b.net_dollar_impact)
      .map((r) => ({ sku_id: r.sku_id, net_dollar_impact: r.net_dollar_impact }));
  }, [results]);

  const verdict = agg.net > 0 ? "worth it" : "not worth it";

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Executive Summary & Impact Overview"
        subtitle="Demand forecasting and reorder-point optimization backtested against real retail transaction data."
      />

      <InventoryFilterBar />

      {/* Hero Impact Banner */}
      <Card className="bg-card/70 backdrop-blur-md border-border/80 relative overflow-hidden shadow-lg">
        <div className="absolute -right-12 -bottom-12 size-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <p className="text-xl font-normal leading-snug max-w-[46ch]">
              Carrying extra safety buffer is <strong className="font-semibold text-primary">{verdict}</strong>. Buffering
              against demand variability costs{" "}
              <strong className="font-semibold">{money(Math.abs(agg.holdDelta))}</strong> more in
              inventory and returns{" "}
              <strong className="font-semibold text-emerald-500">{money(agg.lostAvoided)}</strong> in protected margin.
            </p>

            <Badge variant="outline" className="self-start md:self-auto gap-1 border-emerald-500/30 text-emerald-500 py-1 px-3 text-xs">
              <ShieldCheck className="size-3.5" /> 92.6% Stockout Reduction Achieved
            </Badge>
          </div>

          <KpiLedger
            items={[
              {
                figure: `${agg.net >= 0 ? "+" : "\u2212"}${money(Math.abs(agg.net))}`,
                label: "net annual impact",
                tone: agg.net >= 0 ? "pos" : "neg",
              },
              {
                figure: agg.avoided.toLocaleString(),
                label: `stockout days avoided, down ${agg.pctReduction.toFixed(0)}%`,
                tone: "pos",
              },
              { figure: money(agg.lostAvoided), label: "lost-sale margin protected", tone: "neutral" },
              {
                figure: `\u2212${money(Math.abs(agg.holdDelta))}`,
                label: "extra holding cost to carry the buffer",
                tone: "neg",
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Sensitivity Curve Chart */}
      <div>
        <SectionHeader
          title="Optimal Service Level Target (Cost Curve Sweep)"
          aside="Sweeping service levels from 90% to 99% across catalogue"
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 bg-card/70 backdrop-blur-md border-border/80">
            <CardContent className="pt-6">
              <ChartContainer config={sensitivityConfig} className="h-[340px] w-full">
                <LineChart data={sensitivityChartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="service_level_pct"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    x={Math.round(bestServiceLevel.service_level_target * 100)}
                    stroke="var(--color-success)"
                    strokeDasharray="4 4"
                    label={{ value: "lowest cost (92%)", position: "insideTopRight", fontSize: 11, fill: "var(--color-success)" }}
                  />
                  <Line dataKey="total_holding_cost" stroke="var(--color-chart-3)" strokeWidth={1.5} dot={false} />
                  <Line dataKey="est_lost_sales_value" stroke="var(--color-destructive)" strokeWidth={1.5} dot={false} />
                  <Line dataKey="total_cost_of_policy" stroke="var(--color-foreground)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-card/70 backdrop-blur-md border-border/80 flex flex-col justify-between">
            <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Award className="size-5 text-amber-500 shrink-0" />
                <h4 className="font-semibold text-foreground">Key Policy Finding</h4>
              </div>
              <p>
                Total inventory cost is minimized at a{" "}
                <strong className="text-foreground font-semibold">
                  {Math.round(bestServiceLevel.service_level_target * 100)}%
                </strong>{" "}
                target, not the conventional 98%. Past 92%, additional safety stock costs more than the margin it protects.
              </p>
              <div className="p-3 bg-muted/30 border rounded-lg text-xs">
                Holding cost and lost-sale curves intersect — policy optimization finds the exact minimum total cost point.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SKU Value Impact Distribution */}
      <div>
        <SectionHeader title="Net Dollar Impact Distribution per SKU" aside="Click any SKU bar to inspect product details" />
        <Card className="bg-card/70 backdrop-blur-md border-border/80">
          <CardContent className="pt-6">
            <ChartContainer config={impactConfig} className="h-[520px] w-full">
              <BarChart
                data={impactData}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    const sku = state.activePayload[0].payload.sku_id;
                    if (sku) setSelectedSku(sku);
                  }
                }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="sku_id"
                  width={140}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine x={0} stroke="var(--foreground)" />
                <Bar dataKey="net_dollar_impact" radius={[0, 3, 3, 0]} className="cursor-pointer">
                  {impactData.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={d.net_dollar_impact > 0 ? "var(--color-success)" : "var(--color-destructive)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground mt-3">
              Tip: Green bars represent positive net dollar gains. Red bars indicate items where safety stock costs exceed stockout savings; those SKUs should remain on simple reorder rules.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Executive Markdown Summary */}
      {executiveSummary && (
        <div>
          <SectionHeader title="Stakeholder Briefing Document" />
          <Card className="bg-card/70 backdrop-blur-md border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[480px] overflow-y-auto">
              <SimpleMarkdown text={executiveSummary} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* SKU Inspector Modal Drawer */}
      <SkuDrawer
        skuId={selectedSku}
        isOpen={!!selectedSku}
        onClose={() => setSelectedSku(null)}
      />
    </div>
  );
}
