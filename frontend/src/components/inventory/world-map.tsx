import React, { useState, useMemo } from "react";
import { GeographyRow } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeafletWorldMap } from "./leaflet-world-map";
import { Globe3DMap } from "./globe-3d-map";
import { LogisticsNetworkMap } from "./logistics-network-map";
import { getCountryMeta } from "@/lib/inventory/country-coordinates";
import {
  Globe,
  MapPin,
  Anchor,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  DollarSign,
  TrendingUp,
  Package,
  Percent,
  GitCommit,
  Layers,
} from "lucide-react";

export type MetricType = "revenue" | "profit" | "units" | "margin_pct";
export type MapMode = "leaflet" | "globe" | "vector" | "logistics";

interface WorldMapProps {
  data: GeographyRow[];
  onSelectCountry?: (country: GeographyRow) => void;
  selectedCountryName?: string | null;
  metric?: MetricType;
  onMetricChange?: (metric: MetricType) => void;
}

export function WorldMap({
  data,
  onSelectCountry,
  selectedCountryName,
  metric: externalMetric,
  onMetricChange,
}: WorldMapProps) {
  const [mapMode, setMapMode] = useState<MapMode>("leaflet");
  const [internalMetric, setInternalMetric] = useState<MetricType>("revenue");
  const metric = externalMetric ?? internalMetric;

  const handleMetricChange = (m: MetricType) => {
    setInternalMetric(m);
    onMetricChange?.(m);
  };

  const [search, setSearch] = useState("");
  const [showSupplyRoutes, setShowSupplyRoutes] = useState(true);

  // Vector mode specific state
  const [zoom, setZoom] = useState(1);
  const [hoveredCountry, setHoveredCountry] = useState<GeographyRow | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxValues = useMemo(() => {
    return {
      revenue: Math.max(...data.map((d) => d.revenue), 1),
      profit: Math.max(...data.map((d) => d.profit), 1),
      units: Math.max(...data.map((d) => d.units), 1),
      margin_pct: Math.max(...data.map((d) => Math.abs(d.margin_pct)), 1),
    };
  }, [data]);

  const getMetricValue = (row: GeographyRow, m: MetricType) => row[m];

  const getBubbleRadius = (row: GeographyRow) => {
    const val = Math.abs(getMetricValue(row, metric));
    const max = maxValues[metric];
    const normalized = Math.sqrt(val / max);
    return Math.max(4, Math.min(26, normalized * 26));
  };

  const getBubbleColor = (row: GeographyRow) => {
    if (metric === "margin_pct") {
      if (row.margin_pct < 0) return "#ef4444";
      if (row.margin_pct < 10) return "#f59e0b";
      return "#10b981";
    }
    const val = getMetricValue(row, metric);
    if (val < 0) return "#ef4444";
    const opacity = 0.4 + (val / maxValues[metric]) * 0.6;
    if (metric === "revenue") return `rgba(16, 185, 129, ${opacity.toFixed(2)})`;
    if (metric === "profit") return `rgba(6, 182, 212, ${opacity.toFixed(2)})`;
    if (metric === "units") return `rgba(139, 92, 246, ${opacity.toFixed(2)})`;
    return `rgba(59, 130, 246, ${opacity.toFixed(2)})`;
  };

  const handleMouseMove = (e: React.MouseEvent, country: GeographyRow) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHoveredCountry(country);
  };

  return (
    <div className="relative flex flex-col w-full bg-card/70 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-2xl overflow-hidden transition-all gap-4">
      {/* Top Header: Title, Map Mode Tabs & Country Count */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-10 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Globe className="size-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                International Market Coverage & GIS Intelligence
              </h3>
              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 border border-border">
                {data.length} Countries
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-engine interactive global mapping with real-time supply chain arcs & metric overlays.
            </p>
          </div>
        </div>

        {/* Map View Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/80 p-1.5 rounded-xl border border-border/60">
          <Button
            size="sm"
            variant={mapMode === "leaflet" ? "default" : "ghost"}
            onClick={() => setMapMode("leaflet")}
            className="h-8 text-xs px-3 gap-1.5 rounded-lg font-medium"
          >
            <Layers className="size-3.5" /> GIS Leaflet Map
          </Button>
          <Button
            size="sm"
            variant={mapMode === "globe" ? "default" : "ghost"}
            onClick={() => setMapMode("globe")}
            className="h-8 text-xs px-3 gap-1.5 rounded-lg font-medium"
          >
            <Globe className="size-3.5" /> 3D Globe
          </Button>
          <Button
            size="sm"
            variant={mapMode === "vector" ? "default" : "ghost"}
            onClick={() => setMapMode("vector")}
            className="h-8 text-xs px-3 gap-1.5 rounded-lg font-medium"
          >
            <MapPin className="size-3.5" /> Vector Heatmap
          </Button>
          <Button
            size="sm"
            variant={mapMode === "logistics" ? "default" : "ghost"}
            onClick={() => setMapMode("logistics")}
            className="h-8 text-xs px-3 gap-1.5 rounded-lg font-medium"
          >
            <Anchor className="size-3.5" /> Supply Topology
          </Button>
        </div>
      </div>

      {/* Sub-Toolbar: Metric Selectors, Search, Supply Arcs Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 z-10">
        {/* Metric Pill Selector */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/50 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground px-2">Metric:</span>
          <Button
            size="sm"
            variant={metric === "revenue" ? "default" : "ghost"}
            onClick={() => handleMetricChange("revenue")}
            className="h-7 text-xs px-2.5 gap-1.5 rounded-md"
          >
            <DollarSign className="size-3.5" /> Revenue
          </Button>
          <Button
            size="sm"
            variant={metric === "profit" ? "default" : "ghost"}
            onClick={() => handleMetricChange("profit")}
            className="h-7 text-xs px-2.5 gap-1.5 rounded-md"
          >
            <TrendingUp className="size-3.5" /> Profit
          </Button>
          <Button
            size="sm"
            variant={metric === "units" ? "default" : "ghost"}
            onClick={() => handleMetricChange("units")}
            className="h-7 text-xs px-2.5 gap-1.5 rounded-md"
          >
            <Package className="size-3.5" /> Units
          </Button>
          <Button
            size="sm"
            variant={metric === "margin_pct" ? "default" : "ghost"}
            onClick={() => handleMetricChange("margin_pct")}
            className="h-7 text-xs px-2.5 gap-1.5 rounded-md"
          >
            <Percent className="size-3.5" /> Margin %
          </Button>
        </div>

        {/* Controls: Search + Supply Arcs Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search / highlight country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/90 border-border/70 focus:border-primary"
            />
          </div>

          <Button
            size="sm"
            variant={showSupplyRoutes ? "secondary" : "outline"}
            onClick={() => setShowSupplyRoutes(!showSupplyRoutes)}
            className="h-8 text-xs px-3 gap-1.5 border border-border"
          >
            <GitCommit className={`size-3.5 ${showSupplyRoutes ? "text-primary" : "text-muted-foreground"}`} />
            Supply Arcs
          </Button>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="relative w-full z-0">
        {mapMode === "leaflet" && (
          <LeafletWorldMap
            data={data}
            metric={metric}
            selectedCountryName={selectedCountryName}
            onSelectCountry={onSelectCountry}
            showSupplyRoutes={showSupplyRoutes}
            searchQuery={search}
          />
        )}

        {mapMode === "globe" && (
          <Globe3DMap
            data={data}
            metric={metric}
            selectedCountryName={selectedCountryName}
            onSelectCountry={onSelectCountry}
            showSupplyRoutes={showSupplyRoutes}
          />
        )}

        {mapMode === "logistics" && (
          <LogisticsNetworkMap data={data} onSelectCountry={onSelectCountry} metric={metric} />
        )}

        {mapMode === "vector" && (
          <div className="relative flex flex-col w-full">
            {/* Vector Toolbar */}
            <div className="flex items-center justify-end gap-1 mb-2 z-10">
              <div className="flex items-center gap-1 bg-background/80 border border-border/60 rounded-md p-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
                  title="Zoom In"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.8))}
                  title="Zoom Out"
                >
                  <ZoomOut className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => {
                    setZoom(1);
                    setSearch("");
                  }}
                  title="Reset Map"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Vector SVG Canvas */}
            <div className="relative w-full h-[420px] bg-slate-950 rounded-xl border border-border/50 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
              <svg
                viewBox="0 0 1000 500"
                className="w-full h-full transition-transform duration-300 ease-out"
                style={{ transform: `scale(${zoom})` }}
              >
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" />
                  </pattern>
                  <radialGradient id="oceanGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.08)" />
                    <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
                  </radialGradient>
                </defs>

                <rect width="1000" height="500" fill="url(#oceanGlow)" />
                <rect width="1000" height="500" fill="url(#grid)" />

                {/* Vector Continents */}
                <path
                  d="M 140,80 Q 220,60 300,90 Q 280,180 260,240 Q 180,260 140,160 Z"
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />
                <path
                  d="M 260,260 Q 340,270 360,340 Q 320,440 280,430 Q 240,340 260,260 Z"
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />
                <path
                  d="M 450,110 Q 560,90 580,160 Q 520,200 460,180 Z"
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />
                <path
                  d="M 460,190 Q 580,190 600,290 Q 550,410 490,340 Q 450,260 460,190 Z"
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />
                <path
                  d="M 580,80 Q 880,70 890,230 Q 750,280 620,240 Q 570,160 580,80 Z"
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />
                <path
                  d="M 810,330 Q 910,340 920,410 Q 840,430 810,380 Z"
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                />

                {/* Country Nodes */}
                {data.map((c) => {
                  const meta = getCountryMeta(c.Country);
                  const r = getBubbleRadius(c);
                  const color = getBubbleColor(c);
                  const isSelected = selectedCountryName === c.Country;
                  const isHighlighted = search && c.Country.toLowerCase().includes(search.toLowerCase());

                  return (
                    <g key={c.Country} className="transition-all duration-200 cursor-pointer">
                      {(isSelected || isHighlighted) && (
                        <circle
                          cx={meta.x}
                          cy={meta.y}
                          r={r + 10}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          className="animate-ping opacity-75"
                        />
                      )}
                      <circle
                        cx={meta.x}
                        cy={meta.y}
                        r={r}
                        fill={color}
                        stroke={isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.4)"}
                        strokeWidth={isSelected ? 2.5 : 1}
                        className="hover:scale-125 transition-transform duration-200"
                        onMouseEnter={(e) => handleMouseMove(e, c)}
                        onMouseLeave={() => setHoveredCountry(null)}
                        onClick={() => onSelectCountry?.(c)}
                      />
                      {r > 12 && (
                        <text
                          x={meta.x}
                          y={meta.y + r + 12}
                          textAnchor="middle"
                          fill="rgba(255, 255, 255, 0.85)"
                          fontSize="10"
                          fontWeight="500"
                          className="pointer-events-none drop-shadow select-none"
                        >
                          {meta.flag} {c.Country}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Card */}
              {hoveredCountry && (
                <div
                  className="absolute z-30 bg-slate-900/95 text-slate-100 border border-slate-700 rounded-lg p-3 shadow-2xl pointer-events-none text-xs flex flex-col gap-1 min-w-[170px] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    left: Math.min(tooltipPos.x + 15, 750),
                    top: Math.max(tooltipPos.y - 40, 10),
                  }}
                >
                  <div className="font-semibold text-sm border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>
                      {getCountryMeta(hoveredCountry.Country).flag} {hoveredCountry.Country}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {getCountryMeta(hoveredCountry.Country).region}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px]">
                    <span className="text-slate-400">Revenue:</span>
                    <span className="font-medium text-emerald-400 text-right">
                      ${Math.round(hoveredCountry.revenue).toLocaleString()}
                    </span>
                    <span className="text-slate-400">Profit:</span>
                    <span className="font-medium text-blue-400 text-right">
                      ${Math.round(hoveredCountry.profit).toLocaleString()}
                    </span>
                    <span className="text-slate-400">Units:</span>
                    <span className="font-medium text-slate-200 text-right">
                      {hoveredCountry.units.toLocaleString()}
                    </span>
                    <span className="text-slate-400">Margin:</span>
                    <span
                      className={`font-semibold text-right ${
                        hoveredCountry.margin_pct < 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {hoveredCountry.margin_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
