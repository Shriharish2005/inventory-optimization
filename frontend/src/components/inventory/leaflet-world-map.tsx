import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeographyRow } from "@/types/inventory";
import { MetricType } from "./world-map";
import { getCountryMeta, LOGISTICS_HUBS } from "@/lib/inventory/country-coordinates";
import { Layers, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeafletWorldMapProps {
  data: GeographyRow[];
  metric: MetricType;
  selectedCountryName?: string | null;
  onSelectCountry?: (country: GeographyRow) => void;
  showSupplyRoutes?: boolean;
  searchQuery?: string;
}

export type TileStyle = "dark" | "voyager" | "osm" | "satellite";

const TILE_LAYERS: Record<TileStyle, { url: string; attribution: string; name: string }> = {
  dark: {
    name: "Dark Matter GIS",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  voyager: {
    name: "Voyager Vector",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  osm: {
    name: "OpenStreetMap Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name: "Esri World Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
};

export function LeafletWorldMap({
  data,
  metric,
  selectedCountryName,
  onSelectCountry,
  showSupplyRoutes = false,
  searchQuery = "",
}: LeafletWorldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routesGroupRef = useRef<L.LayerGroup | null>(null);

  const [tileStyle, setTileStyle] = useState<TileStyle>("dark");

  const maxVal = Math.max(
    ...data.map((d) => {
      const val = d[metric];
      return Math.abs(val);
    }),
    1
  );

  // Initialize map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      tileLayerRef.current = L.tileLayer(TILE_LAYERS[tileStyle].url, {
        attribution: TILE_LAYERS[tileStyle].attribution,
        maxZoom: 18,
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      routesGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile style layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const layer = TILE_LAYERS[tileStyle];
    tileLayerRef.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 18,
    }).addTo(mapInstanceRef.current);
  }, [tileStyle]);

  // Handle flyTo when search query matches a country or selected country changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const targetName = selectedCountryName || searchQuery;
    if (!targetName) return;

    const matched = data.find((d) => d.Country.toLowerCase().includes(targetName.toLowerCase()));
    if (matched) {
      const meta = getCountryMeta(matched.Country);
      mapInstanceRef.current.flyTo([meta.lat, meta.lng], 4, {
        duration: 1.5,
      });
    }
  }, [selectedCountryName, searchQuery, data]);

  // Update markers & supply route polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersGroupRef.current || !routesGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    routesGroupRef.current.clearLayers();

    // 1. Draw Logistics Hubs & Supply Routes if enabled
    if (showSupplyRoutes) {
      Object.values(LOGISTICS_HUBS).forEach((hub) => {
        // Hub marker icon
        const hubMarker = L.circleMarker([hub.lat, hub.lng], {
          radius: 8,
          fillColor: "#3b82f6",
          color: "#ffffff",
          weight: 2,
          fillOpacity: 0.9,
        });

        hubMarker.bindTooltip(`🏢 <strong>${hub.name}</strong> (${hub.code})`, {
          direction: "top",
        });

        markersGroupRef.current?.addLayer(hubMarker);
      });

      // Routes between Hubs & Destination Countries
      data.forEach((country) => {
        const meta = getCountryMeta(country.Country);
        const hubMeta = Object.values(LOGISTICS_HUBS).find((h) => h.name.includes(meta.hub) || meta.hub.includes(h.code)) || Object.values(LOGISTICS_HUBS)[0];
        if (!hubMeta) return;

        const isHighlighted = selectedCountryName === country.Country;
        const line = L.polyline(
          [
            [hubMeta.lat, hubMeta.lng],
            [meta.lat, meta.lng],
          ],
          {
            color: isHighlighted ? "#ec4899" : "#3b82f6",
            weight: isHighlighted ? 2.5 : 1,
            opacity: isHighlighted ? 0.9 : 0.35,
            dashArray: "4, 8",
          }
        );

        routesGroupRef.current?.addLayer(line);
      });
    }

    // 2. Draw Country Bubble Markers
    data.forEach((c) => {
      const meta = getCountryMeta(c.Country);
      const val = c[metric];
      const absVal = Math.abs(val);
      const normalized = Math.sqrt(absVal / maxVal);
      const radius = Math.max(5, Math.min(28, normalized * 28));

      let fillColor = "#10b981";
      if (metric === "margin_pct") {
        fillColor = c.margin_pct < 0 ? "#ef4444" : c.margin_pct < 12 ? "#f59e0b" : "#10b981";
      } else if (metric === "profit") {
        fillColor = c.profit < 0 ? "#ef4444" : "#06b6d4";
      } else if (metric === "units") {
        fillColor = "#8b5cf6";
      } else if (val < 0) {
        fillColor = "#ef4444";
      }

      const isSelected = selectedCountryName === c.Country;
      const isSearchMatch = searchQuery && c.Country.toLowerCase().includes(searchQuery.toLowerCase());

      const marker = L.circleMarker([meta.lat, meta.lng], {
        radius: isSelected || isSearchMatch ? radius + 4 : radius,
        fillColor,
        color: isSelected ? "#ffffff" : isSearchMatch ? "#60a5fa" : "rgba(255, 255, 255, 0.4)",
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: isSelected ? 0.9 : 0.7,
      });

      // HTML Popup content with active metric highlight
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 170px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="font-size: 13px;">${meta.flag} ${c.Country}</strong>
            <span style="font-size: 10px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${meta.region}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
            <span style="color: ${metric === 'revenue' ? '#059669' : '#64748b'}; font-weight: ${metric === 'revenue' ? '700' : '400'};">Revenue:</span>
            <strong style="text-align: right; color: #059669;">$${Math.round(c.revenue).toLocaleString()}</strong>
            <span style="color: ${metric === 'profit' ? '#0284c7' : '#64748b'}; font-weight: ${metric === 'profit' ? '700' : '400'};">Profit:</span>
            <strong style="text-align: right; color: ${c.profit < 0 ? '#dc2626' : '#0284c7'};">$${Math.round(c.profit).toLocaleString()}</strong>
            <span style="color: ${metric === 'units' ? '#7c3aed' : '#64748b'}; font-weight: ${metric === 'units' ? '700' : '400'};">Units:</span>
            <strong style="text-align: right; color: ${metric === 'units' ? '#7c3aed' : '#0f172a'};">${c.units.toLocaleString()}</strong>
            <span style="color: ${metric === 'margin_pct' ? '#d97706' : '#64748b'}; font-weight: ${metric === 'margin_pct' ? '700' : '400'};">Margin:</span>
            <strong style="text-align: right; color: ${c.margin_pct < 0 ? '#dc2626' : '#059669'};">${c.margin_pct.toFixed(1)}%</strong>
          </div>
          <div style="margin-top: 8px; font-size: 10px; color: #64748b; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
            Hub: ${meta.hub}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("click", () => {
        onSelectCountry?.(c);
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [data, metric, selectedCountryName, searchQuery, showSupplyRoutes, maxVal, onSelectCountry]);

  return (
    <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-border/60 shadow-xl bg-slate-950">
      {/* Leaflet container ref */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Layer Style Selector Widget */}
      <div className="absolute bottom-3 right-3 z-10 bg-background/90 backdrop-blur-md border border-border/80 rounded-lg p-1.5 shadow-lg flex items-center gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 font-medium">
          <Layers className="size-3.5 text-primary" /> Map Tile:
        </div>
        {(["dark", "voyager", "osm", "satellite"] as TileStyle[]).map((style) => (
          <Button
            key={style}
            size="sm"
            variant={tileStyle === style ? "default" : "ghost"}
            onClick={() => setTileStyle(style)}
            className="h-6 text-[11px] px-2 capitalize rounded"
          >
            {style}
          </Button>
        ))}
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 shadow-lg flex flex-col gap-1.5 max-w-[200px]">
        <div className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-100 border-b border-slate-800 pb-1">
          <Compass className="size-3.5 text-blue-400" /> GIS Layer Meta
        </div>
        <div className="text-[11px] text-slate-400 flex justify-between">
          <span>Tile Server:</span>
          <span className="font-medium text-slate-200 truncate capitalize">{tileStyle}</span>
        </div>
        <div className="text-[11px] text-slate-400 flex justify-between">
          <span>Active Nodes:</span>
          <span className="font-medium text-emerald-400">{data.length} Countries</span>
        </div>
        {showSupplyRoutes && (
          <div className="text-[10px] text-pink-400 bg-pink-500/10 border border-pink-500/30 rounded px-1.5 py-0.5 mt-0.5">
            ⚡ Supply Arcs Active
          </div>
        )}
      </div>
    </div>
  );
}
