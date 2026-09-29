import { AlertRow } from "@/types/inventory";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Download, Truck, AlertTriangle } from "lucide-react";

interface PoDrawerProps {
  alerts: AlertRow[];
  isOpen: boolean;
  onClose: () => void;
}

export function PoDrawer({ alerts, isOpen, onClose }: PoDrawerProps) {
  const criticalItems = alerts.filter((a) => a.status === "RED" && a.suggested_order_qty > 0);
  const totalUnits = criticalItems.reduce((s, a) => s + a.suggested_order_qty, 0);
  const maxLeadTime = criticalItems.reduce((m, a) => Math.max(m, a.lead_time_days), 0);

  const downloadPoSummary = () => {
    if (!criticalItems.length) return;
    const csvLines = [
      "SKU,Category,Market,ABC_Class,Suggested_Order_Qty,Lead_Time_Days",
      ...criticalItems.map(
        (a) => `${a.sku_id},${a.category},${a.market},${a.abc_class},${a.suggested_order_qty},${a.lead_time_days}`
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Purchase_Order_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 flex flex-col gap-6">
        <SheetHeader className="text-left border-b pb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            <SheetTitle className="text-xl font-bold">Generated Purchase Order</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Automated purchase order bundle for all critical RED SKUs below reorder point.
          </SheetDescription>
        </SheetHeader>

        {/* PO Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3.5 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShoppingCart className="size-3.5 text-primary" /> Critical Line Items
              </span>
              <span className="text-xl font-bold text-foreground">{criticalItems.length} SKUs</span>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-3.5 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Truck className="size-3.5 text-emerald-500" /> Total Order Volume
              </span>
              <span className="text-xl font-bold text-emerald-500">
                {totalUnits.toLocaleString()} units
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Lead time notice */}
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Maximum lead time for this batch is <strong>{maxLeadTime} days</strong>. Place orders immediately to prevent stockouts.
          </span>
        </div>

        {/* Item List Preview */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Order Items Breakdown
          </span>
          <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y bg-muted/20">
            {criticalItems.slice(0, 20).map((item) => (
              <div key={item.sku_id} className="p-2.5 flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{item.sku_id}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.category} • {item.market}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Class {item.abc_class}
                  </Badge>
                  <span className="font-mono font-bold text-primary">
                    +{item.suggested_order_qty.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {criticalItems.length > 20 && (
              <div className="p-2 text-center text-xs text-muted-foreground italic">
                + {criticalItems.length - 20} more items included in exported PO
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" className="gap-2" onClick={downloadPoSummary}>
            <Download className="size-4" /> Download Official PO (CSV)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
