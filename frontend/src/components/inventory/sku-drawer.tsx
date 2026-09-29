import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { policy, skuDim, forecastAccuracy, variability, alerts } from "@/lib/inventory/data";
import { Package, DollarSign, Clock, ShieldCheck, Activity, Target, AlertTriangle } from "lucide-react";

interface SkuDrawerProps {
  skuId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SkuDrawer({ skuId, isOpen, onClose }: SkuDrawerProps) {
  if (!skuId) return null;

  const pol = policy.find((p) => p.sku_id === skuId);
  const dim = skuDim.find((s) => s.sku_id === skuId);
  const acc = forecastAccuracy.find((a) => a.sku_id === skuId);
  const varRow = variability.find((v) => v.sku_id === skuId);
  const alertRow = alerts.find((a) => a.sku_id === skuId);

  if (!pol) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 flex flex-col gap-6">
        <SheetHeader className="text-left border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <SheetTitle className="text-xl font-bold">{skuId}</SheetTitle>
            </div>
            <Badge variant="outline" className="font-bold border-primary/30 text-primary">
              Class {pol.abc_class}
            </Badge>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            {pol.category} • {pol.sub_category} • Market: {pol.market}
          </SheetDescription>
        </SheetHeader>

        {/* Status Callout */}
        {alertRow && (
          <div
            className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold ${
              alertRow.status === "RED"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : alertRow.status === "YELLOW"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {alertRow.status === "RED" ? (
                <AlertTriangle className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Stock Status: {alertRow.status}
            </span>
            <span>
              On hand: {alertRow.stock_on_hand.toLocaleString()} / ROP: {alertRow.reorder_point.toLocaleString()}
            </span>
          </div>
        )}

        {/* Financial Economics */}
        {dim && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/70 backdrop-blur-md border-border/80">
              <CardContent className="p-3.5 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="size-3.5 text-primary" /> Unit Cost / Price
                </span>
                <span className="text-sm font-bold text-foreground">
                  ${dim.unit_cost.toFixed(2)} / ${dim.unit_price.toFixed(2)}
                </span>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-md border-border/80">
              <CardContent className="p-3.5 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5 text-amber-500" /> Supplier Lead Time
                </span>
                <span className="text-sm font-bold text-foreground">{pol.lead_time_days} Days</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Optimization Metrics */}
        <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/20">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Inventory Policy Parameters
          </span>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="flex flex-col p-2 bg-card rounded-md border">
              <span className="text-[10px] text-muted-foreground">Safety Stock</span>
              <span className="text-sm font-bold text-amber-500">{pol.safety_stock.toLocaleString()}</span>
            </div>
            <div className="flex flex-col p-2 bg-card rounded-md border">
              <span className="text-[10px] text-muted-foreground">Reorder Point (s)</span>
              <span className="text-sm font-bold text-foreground">{pol.reorder_point.toLocaleString()}</span>
            </div>
            <div className="flex flex-col p-2 bg-card rounded-md border">
              <span className="text-[10px] text-muted-foreground">EOQ (Q)</span>
              <span className="text-sm font-bold text-primary">{pol.eoq.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Forecasting Performance */}
        {acc && (
          <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/20 text-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Demand Forecast Model
            </span>
            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Target className="size-3.5 text-primary" /> Winning Model:
              </span>
              <Badge variant="secondary" className="capitalize font-mono text-[11px]">
                {acc.best_model.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Activity className="size-3.5 text-emerald-500" /> Backtest Accuracy:
              </span>
              <span className="font-semibold text-foreground">
                MAE: {acc.best_mae} | MAPE: {acc.best_mape}%
              </span>
            </div>
            {varRow && (
              <div className="flex items-center justify-between border-t pt-2 mt-1">
                <span className="text-muted-foreground">Zero-Sales Share:</span>
                <span className="font-mono text-muted-foreground">
                  {Math.round(varRow.zero_day_share * 100)}% of selling days
                </span>
              </div>
            )}
          </div>
        )}

        {/* Annual Financial Cost */}
        <div className="flex items-center justify-between border-t pt-4 text-xs">
          <span className="text-muted-foreground">Annual Policy Cost:</span>
          <span className="text-base font-bold text-foreground">
            ${Math.round(pol.annual_inventory_cost).toLocaleString()} / yr
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
