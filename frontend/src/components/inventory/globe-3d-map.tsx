import React, { useState, useEffect, useRef, useMemo } from "react";
import { GeographyRow } from "@/types/inventory";
import { MetricType } from "./world-map";
import { getCountryMeta, LOGISTICS_HUBS } from "@/lib/inventory/country-coordinates";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Globe3DMapProps {
  data: GeographyRow[];
  metric: MetricType;
  selectedCountryName?: string | null;
  onSelectCountry?: (country: GeographyRow) => void;
  showSupplyRoutes?: boolean;
}

export function Globe3DMap({
  data,
  metric,
  selectedCountryName,
  onSelectCountry,
  showSupplyRoutes = true,
}: Globe3DMapProps) {
  const [rotation, setRotation] = useState(0); // Longitude rotation angle
  const [tilt, setTilt] = useState(15); // Latitude tilt angle
  const [isRotating, setIsRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; rot: number; t: number }>({ x: 0, y: 0, rot: 0, t: 15 });

  const maxVal = useMemo(
    () => Math.max(...data.map((d) => Math.abs(d[metric])), 1),
    [data, metric]
  );

  // Auto-rotation animation loop
  useEffect(() => {
    if (!isRotating || isDragging) return;
    const interval = setInterval(() => {
      setRotation((r) => (r + 0.4) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isRotating, isDragging]);

  // Center globe on selected country
  useEffect(() => {
    if (!selectedCountryName) return;
    const match = data.find((d) => d.Country === selectedCountryName);
    if (match) {
      const meta = getCountryMeta(match.Country);
      setRotation(-meta.lng);
      setTilt(meta.lat / 2);
    }
  }, [selectedCountryName, data]);

  // Drag hander for mouse rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, rot: rotation, t: tilt };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setRotation((dragStartRef.current.rot + dx * 0.5) % 360);
    setTilt(Math.max(-60, Math.min(60, dragStartRef.current.t - dy * 0.3)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Convert lat/lng on rotating orthographic 3D sphere into 2D canvas coordinates
  // Globe center at (400, 220), radius R = 180
  const R = 180;
  const CX = 400;
  const CY = 220;

  const project3D = (lat: number, lng: number) => {
    const radLat = (lat * Math.PI) / 180;
    const radLng = ((lng + rotation) * Math.PI) / 180;
    const radTilt = (tilt * Math.PI) / 180;

    // 3D coordinates on unit sphere
    const x0 = Math.cos(radLat) * Math.sin(radLng);
    const y0 = Math.sin(radLat);
    const z0 = Math.cos(radLat) * Math.cos(radLng);

    // Rotate by tilt angle around X axis
    const y1 = y0 * Math.cos(radTilt) - z0 * Math.sin(radTilt);
    const z1 = y0 * Math.sin(radTilt) + z0 * Math.cos(radTilt);

    const visible = z1 > -0.15; // Visible if on the front hemispshere

    return {
      x: CX + x0 * R,
      y: CY - y1 * R,
      visible,
      z: z1,
    };
  };

  // Generate latitude and longitude wireframe grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    // Latitudes
    for (let lat = -60; lat <= 60; lat += 30) {
      const points = [];
      for (let lng = -180; lng <= 180; lng += 10) {
        points.push({ lat, lng });
      }
      lines.push(points);
    }
    // Longitudes
    for (let lng = -180; lng < 180; lng += 30) {
      const points = [];
      for (let lat = -80; lat <= 80; lat += 10) {
        points.push({ lat, lng });
      }
      lines.push(points);
    }
    return lines;
  }, []);

  return (
    <div
      className="relative w-full h-[460px] rounded-xl overflow-hidden border border-border/70 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 3D Orthographic Globe Canvas SVG */}
      <svg viewBox="0 0 800 440" className="w-full h-full">
        <defs>
          <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="95%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </radialGradient>
          <filter id="atmosphereGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Atmosphere Halo Shadow */}
        <circle cx={CX} cy={CY} r={R + 12} fill="rgba(59, 130, 246, 0.12)" filter="url(#atmosphereGlow)" />
        {/* Globe Base Sphere */}
        <circle cx={CX} cy={CY} r={R} fill="url(#globeGlow)" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1.5" />

        {/* Rotating Lat/Lng Wireframe Grid */}
        {gridLines.map((line, idx) => {
          const pathD = line.reduce((acc, pt, i) => {
            const p = project3D(pt.lat, pt.lng);
            if (!p.visible) return acc;
            return i === 0 || acc === "" ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }, "");
          if (!pathD) return null;
          return <path key={idx} d={pathD} fill="none" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="0.75" />;
        })}

        {/* Supply Arcs connecting Hubs & Destination Countries */}
        {showSupplyRoutes &&
          data.map((country) => {
            const meta = getCountryMeta(country.Country);
            const hubMeta = Object.values(LOGISTICS_HUBS).find((h) => h.name.includes(meta.hub) || meta.hub.includes(h.code)) || Object.values(LOGISTICS_HUBS)[0];
            if (!hubMeta) return null;

            const p1 = project3D(hubMeta.lat, hubMeta.lng);
            const p2 = project3D(meta.lat, meta.lng);

            if (!p1.visible && !p2.visible) return null;

            // Compute arc mid point curve
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 - 25;

            const isSelected = selectedCountryName === country.Country;

            return (
              <path
                key={`arc-${country.Country}`}
                d={`M ${p1.x},${p1.y} Q ${midX},${midY} ${p2.x},${p2.y}`}
                fill="none"
                stroke={isSelected ? "#f43f5e" : "#3b82f6"}
                strokeWidth={isSelected ? "2" : "1"}
                strokeDasharray="3 4"
                opacity={isSelected ? 0.9 : 0.4}
              />
            );
          })}

        {/* 3D Country Nodes */}
        {data.map((c) => {
          const meta = getCountryMeta(c.Country);
          const p = project3D(meta.lat, meta.lng);
          if (!p.visible) return null;

          const val = Math.abs(c[metric]);
          const norm = Math.sqrt(val / maxVal);
          const r = Math.max(3, Math.min(18, norm * 18));
          const isSelected = selectedCountryName === c.Country;

          let color = "#10b981";
          if (metric === "margin_pct") {
            color = c.margin_pct < 0 ? "#ef4444" : c.margin_pct < 12 ? "#f59e0b" : "#10b981";
          } else if (metric === "profit") {
            color = c.profit < 0 ? "#ef4444" : "#06b6d4";
          } else if (metric === "units") {
            color = "#8b5cf6";
          }

          return (
            <g
              key={c.Country}
              className="cursor-pointer transition-transform hover:scale-125"
              onClick={() => onSelectCountry?.(c)}
            >
              {isSelected && (
                <circle cx={p.x} cy={p.y} r={r + 8} fill="none" stroke="#3b82f6" strokeWidth="2" className="animate-ping" />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={color}
                stroke={isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.6)"}
                strokeWidth={isSelected ? 2 : 1}
                opacity={0.85 + p.z * 0.15}
              />
              {r > 10 && (
                <text
                  x={p.x}
                  y={p.y + r + 10}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="9"
                  fontWeight="600"
                  className="pointer-events-none drop-shadow"
                >
                  {meta.flag} {c.Country}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Rotation Control Toolbar */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsRotating(!isRotating)}
          className="h-7 text-xs gap-1.5 text-slate-200 hover:text-white"
        >
          {isRotating ? <Pause className="size-3.5 text-amber-400" /> : <Play className="size-3.5 text-emerald-400" />}
          {isRotating ? "Pause Spin" : "Auto Rotate"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setRotation(0);
            setTilt(15);
          }}
          className="h-7 text-xs px-2 text-slate-400 hover:text-slate-200"
          title="Reset Globe View"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>

      {/* Globe Drag Helper Banner */}
      <div className="absolute top-3 right-3 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-md px-2.5 py-1 text-[11px] text-slate-400">
        🖱️ Click & Drag to Rotate 3D Sphere
      </div>
    </div>
  );
}
