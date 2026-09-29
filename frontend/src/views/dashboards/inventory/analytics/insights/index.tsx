import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeInsights, type InsightSeverity } from "@/lib/inventory/analytics";
import { InventoryPageHeader } from "@/components/inventory/page-header";
import { InventoryFilterBar } from "@/components/inventory/filter-bar";
import { SectionHeader } from "@/components/inventory/section-header";
import { AlertTriangle, CheckCircle2, Info, XCircle, Lightbulb, Filter } from "lucide-react";

const SEVERITY_CONFIG: Record<InsightSeverity, { icon: React.ReactNode; border: string; bg: string; badge: string; label: string }> = {
  critical: { icon: <XCircle className="size-4 shrink-0 text-destructive mt-0.5" />, border: "border-destructive/30", bg: "bg-destructive/5", badge: "bg-destructive/10 text-destructive border-destructive/30", label: "Critical" },
  warning:  { icon: <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />, border: "border-amber-500/30", bg: "bg-amber-500/5",     badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",     label: "Warning" },
  info:     { icon: <Info className="size-4 shrink-0 text-sky-500 mt-0.5" />,           border: "border-sky-500/30",    bg: "bg-sky-500/5",         badge: "bg-sky-500/10 text-sky-500 border-sky-500/30",           label: "Info" },
  success:  { icon: <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />, border: "border-emerald-500/30", bg: "bg-emerald-500/5",   badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", label: "Positive" },
};

export default function InsightsView() {
  const [filterSeverity, setFilterSeverity] = useState<InsightSeverity | "All">("All");
  const insights = useMemo(() => computeInsights(), []);

  const filtered = useMemo(() =>
    filterSeverity === "All" ? insights : insights.filter((i) => i.severity === filterSeverity),
    [insights, filterSeverity]
  );

  const counts = useMemo(() => {
    const c: Record<InsightSeverity, number> = { critical: 0, warning: 0, info: 0, success: 0 };
    for (const i of insights) c[i.severity]++;
    return c;
  }, [insights]);

  return (
    <div className="flex flex-col gap-6">
      <InventoryPageHeader
        title="Actionable Insights"
        subtitle="Automatically generated recommendations from live inventory analytics — replenishment needs, excess stock, supplier risks, and opportunities."
      />
      <InventoryFilterBar />

      {/* Insight Count Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["critical","warning","info","success"] as InsightSeverity[]).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <Card
              key={sev}
              className={`bg-card/70 backdrop-blur-md border cursor-pointer transition-all hover:shadow-md ${filterSeverity === sev ? `ring-2 ${cfg.border}` : "border-border/60"}`}
              onClick={() => setFilterSeverity(filterSeverity === sev ? "All" : sev)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground capitalize">{cfg.label}</span>
                  <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{counts[sev]}</h3>
                </div>
                {cfg.icon}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Filter:</span>
        {(["All","critical","warning","info","success"] as const).map((sev) => (
          <Button
            key={sev} size="sm" variant={filterSeverity === sev ? "default" : "outline"}
            className="h-7 text-xs capitalize"
            onClick={() => setFilterSeverity(sev as InsightSeverity | "All")}
          >
            {sev === "All" ? "All Insights" : SEVERITY_CONFIG[sev as InsightSeverity].label}
            {sev !== "All" && <span className="ml-1.5 opacity-70">({counts[sev as InsightSeverity]})</span>}
          </Button>
        ))}
      </div>

      {/* Insight Cards */}
      <div>
        <SectionHeader title={`${filtered.length} Insight${filtered.length !== 1 ? "s" : ""}`} aside="Based on live pipeline data" />
        <div className="flex flex-col gap-3">
          {filtered.map((insight) => {
            const cfg = SEVERITY_CONFIG[insight.severity];
            return (
              <Card key={insight.id} className={`border ${cfg.border} ${cfg.bg} backdrop-blur-md`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {cfg.icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-sm text-foreground leading-tight">{insight.title}</h4>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 ${cfg.badge}`}>{cfg.label}</Badge>
                        {insight.value && (
                          <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0">{insight.value}</Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{insight.description}</p>

                      {insight.affectedSkus && insight.affectedSkus.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="text-[10px] text-muted-foreground font-medium mr-1">Affected SKUs:</span>
                          {insight.affectedSkus.map((sku) => (
                            <Badge key={sku} variant="outline" className="text-[10px] font-mono px-1.5 py-0">{sku}</Badge>
                          ))}
                          {(insight.affectedSkus.length >= 5) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">+ more</Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/40">
                        <Lightbulb className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Recommended Action: </strong>{insight.action}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <CheckCircle2 className="size-10 mx-auto mb-3 text-emerald-500 opacity-40" />
              No insights in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
