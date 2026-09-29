import React, { useState } from "react";
import { GeographyRow } from "@/types/inventory";
import { MetricType } from "./world-map";
import { LOGISTICS_HUBS, getCountryMeta } from "@/lib/inventory/country-coordinates";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Anchor, ShieldCheck, Clock, ArrowRight, DollarSign, TrendingUp, Package, Percent } from "lucide-react";

interface LogisticsNetworkMapProps {
  data: GeographyRow[];
  onSelectCountry?: (country: GeographyRow) => void;
  metric?: MetricType;
}

export function LogisticsNetworkMap({ data, onSelectCountry, metric = "revenue" }: LogisticsNetworkMapProps) {
  const [selectedHub, setSelectedHub] = useState<string>("Frankfurt Logistics Hub");

  // Group countries by logistics hub with all metric aggregations
  const hubDistribution = React.useMemo(() => {
    const map: Record<
      string,
      {
        countries: GeographyRow[];
        totalRev: number;
        totalProfit: number;
        totalUnits: number;
        avgMargin: number;
      }
    > = {};

    Object.keys(LOGISTICS_HUBS).forEach((hubKey) => {
      map[hubKey] = { countries: [], totalRev: 0, totalProfit: 0, totalUnits: 0, avgMargin: 0 };
    });

    data.forEach((c) => {
      const meta = getCountryMeta(c.Country);
      const hubKey =
        Object.keys(LOGISTICS_HUBS).find((k) => k.includes(meta.hub) || meta.hub.includes(k)) ||
        "Frankfurt Logistics Hub";
      if (!map[hubKey]) {
        map[hubKey] = { countries: [], totalRev: 0, totalProfit: 0, totalUnits: 0, avgMargin: 0 };
      }
      map[hubKey].countries.push(c);
      map[hubKey].totalRev += c.revenue;
      map[hubKey].totalProfit += c.profit;
      map[hubKey].totalUnits += c.units;
    });

    Object.values(map).forEach((h) => {
      h.avgMargin = h.totalRev > 0 ? (h.totalProfit / h.totalRev) * 100 : 0;
      // Sort countries in each hub by current metric descending
      h.countries.sort((a, b) => {
        if (metric === "margin_pct") return b.margin_pct - a.margin_pct;
        return (b[metric] as number) - (a[metric] as number);
      });
    });

    return map;
  }, [data, metric]);

  const activeHubInfo = LOGISTICS_HUBS[selectedHub] || Object.values(LOGISTICS_HUBS)[0];
  const activeHubData = hubDistribution[selectedHub] || {
    countries: [],
    totalRev: 0,
    totalProfit: 0,
    totalUnits: 0,
    avgMargin: 0,
  };

  const getMetricDisplay = (stats: {
    totalRev: number;
    totalProfit: number;
    totalUnits: number;
    avgMargin: number;
  }) => {
    switch (metric) {
      case "profit":
        return {
          value: `${stats.totalProfit >= 0 ? "$" : "-$"}${Math.round(Math.abs(stats.totalProfit) / 1000).toLocaleString()}k`,
          color: stats.totalProfit >= 0 ? "text-cyan-400" : "text-rose-400",
          tag: "PROFIT",
        };
      case "units":
        return {
          value: `${Math.round(stats.totalUnits / 1000).toLocaleString()}k`,
          color: "text-violet-400",
          tag: "UNITS",
        };
      case "margin_pct":
        return {
          value: `${stats.avgMargin.toFixed(1)}%`,
          color: stats.avgMargin >= 15 ? "text-emerald-400" : stats.avgMargin >= 5 ? "text-amber-400" : "text-rose-400",
          tag: "MARGIN",
        };
      case "revenue":
      default:
        return {
          value: `$${Math.round(stats.totalRev / 1000).toLocaleString()}k`,
          color: "text-emerald-400",
          tag: "REV",
        };
    }
  };

  const metricMeta = {
    revenue: { label: "Revenue ($)", icon: <DollarSign className="size-3 text-emerald-400" />, badge: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" },
    profit: { label: "Net Profit ($)", icon: <TrendingUp className="size-3 text-cyan-400" />, badge: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10" },
    units: { label: "Units Shipped", icon: <Package className="size-3 text-violet-400" />, badge: "border-violet-500/40 text-violet-400 bg-violet-500/10" },
    margin_pct: { label: "Weighted Margin (%)", icon: <Percent className="size-3 text-amber-400" />, badge: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
  }[metric];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Visual Logistics Network Map Canvas */}
      <div className="relative w-full min-h-[360px] bg-slate-950 rounded-xl border border-border/70 overflow-hidden p-4 flex flex-col justify-between">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Header Title Bar */}
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Anchor className="size-5 text-blue-400 animate-pulse" />
            <h4 className="text-sm font-semibold text-slate-100">
              Global Fulfillment Hub Topology & Route Optimization
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs flex items-center gap-1 ${metricMeta.badge}`}>
              {metricMeta.icon} Active: {metricMeta.label}
            </Badge>
            <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400 bg-blue-500/10">
              7 Primary Global Warehouses
            </Badge>
          </div>
        </div>

        {/* Hub Selection Nodes Display */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 my-auto py-3">
          {Object.entries(LOGISTICS_HUBS).map(([key, hub]) => {
            const stats = hubDistribution[key] || {
              countries: [],
              totalRev: 0,
              totalProfit: 0,
              totalUnits: 0,
              avgMargin: 0,
            };
            const isSelected = selectedHub === key;
            const display = getMetricDisplay(stats);

            return (
              <button
                key={key}
                onClick={() => setSelectedHub(key)}
                className={`flex flex-col p-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100 truncate">{hub.code}</span>
                  <span className="text-[10px] text-blue-400 font-mono font-semibold">
                    {stats.countries.length} MKTS
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 truncate mt-0.5">{hub.name.split(" ")[0]}</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className={`text-[11px] font-bold font-mono ${display.color}`}>
                    {display.value}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono uppercase">{display.tag}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Hub Active Route Status Banner */}
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-blue-400">{activeHubInfo.name}</span>
            <span className="text-slate-500">|</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="size-3.5 text-amber-400" /> Avg Lead Time: <strong>3-6 Days Air / 14 Days Sea</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="size-3.5" /> Hub Status: Operational (99.4% SLA)
          </div>
        </div>
      </div>

      {/* Target Destination Country Cards assigned to selected Hub */}
      <Card className="bg-card/70 border-border/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              Served Markets for <span className="text-primary">{activeHubInfo.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                (sorted by {metric === "margin_pct" ? "Margin %" : metric})
              </span>
            </h4>
            <span className="text-xs text-muted-foreground font-mono">
              {activeHubData.countries.length} Destination Countries
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {activeHubData.countries.map((country) => {
              const meta = getCountryMeta(country.Country);

              return (
                <div
                  key={country.Country}
                  onClick={() => onSelectCountry?.(country)}
                  className="p-2.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-accent/60 hover:border-primary/50 transition-all cursor-pointer flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span>{meta.flag}</span> {country.Country}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                  </div>

                  {/* Primary Highlighted Metric */}
                  <div className="p-1.5 rounded-md bg-background/60 border border-border/40 mt-1 flex items-center justify-between font-mono">
                    <span className="text-[10px] text-muted-foreground uppercase font-sans">
                      {metric === "margin_pct" ? "Margin" : metric}:
                    </span>
                    <strong
                      className={`text-xs ${
                        metric === "profit"
                          ? country.profit >= 0 ? "text-cyan-400" : "text-rose-400"
                          : metric === "units"
                          ? "text-violet-400"
                          : metric === "margin_pct"
                          ? country.margin_pct >= 15 ? "text-emerald-400" : country.margin_pct >= 0 ? "text-amber-400" : "text-rose-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {metric === "revenue"
                        ? `$${Math.round(country.revenue).toLocaleString()}`
                        : metric === "profit"
                        ? `${country.profit >= 0 ? "$" : "-$"}${Math.round(Math.abs(country.profit)).toLocaleString()}`
                        : metric === "units"
                        ? `${country.units.toLocaleString()} units`
                        : `${country.margin_pct.toFixed(1)}%`}
                    </strong>
                  </div>

                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                    {metric !== "revenue" && (
                      <div className="flex justify-between">
                        <span>Rev:</span>
                        <span className="font-mono text-foreground">${Math.round(country.revenue / 1000)}k</span>
                      </div>
                    )}
                    {metric !== "profit" && (
                      <div className="flex justify-between">
                        <span>Profit:</span>
                        <span className={`font-mono ${country.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          ${Math.round(country.profit / 1000)}k
                        </span>
                      </div>
                    )}
                    {metric !== "units" && (
                      <div className="flex justify-between">
                        <span>Units:</span>
                        <span className="font-mono text-foreground">{country.units.toLocaleString()}</span>
                      </div>
                    )}
                    {metric !== "margin_pct" && (
                      <div className="flex justify-between">
                        <span>Margin:</span>
                        <span className={`font-mono ${country.margin_pct >= 0 ? "text-foreground" : "text-rose-400"}`}>
                          {country.margin_pct.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
