import { GeographyRow } from "@/types/inventory";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, DollarSign, TrendingUp, Package, Percent, Award, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CountryDrawerProps {
  country: GeographyRow | null;
  isOpen: boolean;
  onClose: () => void;
  globalRank?: number;
  totalCountries?: number;
}

export function CountryDrawer({ country, isOpen, onClose, globalRank, totalCountries = 147 }: CountryDrawerProps) {
  if (!country) return null;

  const isHighMargin = country.margin_pct >= 15;
  const isNegativeMargin = country.margin_pct < 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 flex flex-col gap-6">
        <SheetHeader className="text-left border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              <SheetTitle className="text-xl font-bold">{country.Country}</SheetTitle>
            </div>
            {globalRank && (
              <Badge variant="secondary" className="text-xs font-semibold gap-1">
                <Award className="size-3.5 text-amber-500" /> Rank #{globalRank} of {totalCountries}
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Country performance breakdown derived directly from underlying transaction data.
          </SheetDescription>
        </SheetHeader>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3.5 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="size-3.5 text-primary" /> Total Revenue
              </span>
              <span className="text-lg font-bold text-foreground">
                ${Math.round(country.revenue).toLocaleString()}
              </span>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-3.5 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="size-3.5 text-emerald-500" /> Net Profit
              </span>
              <span className={`text-lg font-bold ${country.profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                ${Math.round(country.profit).toLocaleString()}
              </span>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-3.5 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Package className="size-3.5 text-blue-500" /> Total Units
              </span>
              <span className="text-lg font-bold text-foreground">
                {country.units.toLocaleString()}
              </span>
            </CardContent>
          </Card>

          <Card className={isNegativeMargin ? "bg-destructive/5 border-destructive/20" : "bg-amber-500/5 border-amber-500/20"}>
            <CardContent className="p-3.5 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent className="size-3.5 text-amber-500" /> Margin %
              </span>
              <span className={`text-lg font-bold ${isNegativeMargin ? "text-destructive" : "text-amber-500"}`}>
                {country.margin_pct.toFixed(1)}%
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Strategic Classification Banner */}
        <div className="flex flex-col gap-2 border rounded-lg p-4 bg-muted/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Market Category Strategy
          </span>
          <div className="flex items-center gap-2">
            {isHighMargin ? (
              <>
                <CheckCircle2 className="size-5 text-emerald-500" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">High-Margin Priority Market</h4>
                  <p className="text-xs text-muted-foreground">
                    Delivers exceptional profitability ({country.margin_pct.toFixed(1)}% margin). Prioritize high-stock fulfillment.
                  </p>
                </div>
              </>
            ) : isNegativeMargin ? (
              <>
                <AlertTriangle className="size-5 text-destructive" />
                <div>
                  <h4 className="text-sm font-semibold text-destructive">Loss-Making Market</h4>
                  <p className="text-xs text-muted-foreground">
                    Negative profit margin. Review pricing strategy or shipping/fulfillment overheads for this region.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Package className="size-5 text-blue-500" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Core Volume Driver</h4>
                  <p className="text-xs text-muted-foreground">
                    Consistent sales volume with moderate profit margins. Maintain baseline service level policies.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Operational Notes */}
        <div className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
          <p>
            <strong>Note:</strong> Country-level demand feeds directly into market-wide aggregate forecasting models. Reorder points calculated in policy views buffer against variability across these regions.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
