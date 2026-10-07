"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { LatLngBounds, Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { GeoJSON, MapContainer, useMap } from "react-leaflet";

import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

// ── Color scale ────────────────────────────────────────────────────────────────

const COLOR_SCALE = [
  { min: 100, fill: "#15803d", label: "100 and above" },
  { min: 50,  fill: "#4ade80", label: "50 – 100" },
  { min: 20,  fill: "#fde047", label: "20 – 50" },
  { min: 10,  fill: "#fb923c", label: "10 – 20" },
  { min: 0,   fill: "#f87171", label: "Below 10" },
] as const;

function getDistrictColor(count: number): string {
  for (const range of COLOR_SCALE) {
    if (count >= range.min) return range.fill;
  }
  return "#f87171";
}

// ── FitBounds ──────────────────────────────────────────────────────────────────

function FitBounds({ geoData }: { geoData: FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    let active = true;
    let bounds: LatLngBounds | null = null;
    const fit = () => {
      if (bounds?.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    };
    import("leaflet").then((L) => {
      if (!active) return;
      bounds = L.geoJSON(geoData).getBounds();
      fit();
    });
    // The map stretches to its dashboard row, whose height settles as the other cards
    // load — Leaflet doesn't notice container resizes, so tell it and refit Kerala.
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      fit();
    });
    observer.observe(map.getContainer());
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [map, geoData]);
  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DistrictEntry {
  name: string;
  name_ml: string;
  count: number;
}

interface Props {
  data: DistrictEntry[];
  locale?: string;
}

// ── Main Component ─────────────────────────────────────────────────────────────

// The map grows past this to match the height of the cards beside it.
const MAP_MIN_HEIGHT = "min(360px, 75vw)";

export function KeralaDistrictMap({ data, locale }: Props) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const isDark = usePreferencesStore((s) => s.resolvedThemeMode === "dark");

  // Computed synchronously during render so styleFeature/onEachFeature always see current data
  const countMap = useMemo(() => new Map(data.map((d) => [d.name, d])), [data]);

  useEffect(() => {
    // Floating hover tooltip
    const tt = document.createElement("div");
    tt.style.cssText =
      "position:fixed;z-index:9999;pointer-events:none;" +
      "border-radius:8px;padding:7px 11px;" +
      "font-family:system-ui,sans-serif;font-size:13px;line-height:1.4;display:none;";
    document.body.appendChild(tt);
    tooltipRef.current = tt;

    // District name label CSS
    if (!document.getElementById("kau-district-label-css")) {
      const s = document.createElement("style");
      s.id = "kau-district-label-css";
      s.textContent = `
        .district-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          font-size: 9.5px !important;
          font-weight: 700 !important;
          color: #1f2937 !important;
          white-space: nowrap !important;
          text-shadow: 0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff;
          pointer-events: none !important;
        }
        .dark .district-label {
          color: #f9fafb !important;
          text-shadow: 0 0 4px #000, 0 0 4px #000, 0 0 4px #000, 0 0 4px #000;
        }
        .district-label::before { display: none !important; }

        /* Zoom controls — dark mode */
        .dark .leaflet-bar a {
          background: #1f2937 !important;
          color: #f9fafb !important;
          border-color: #374151 !important;
        }
        .dark .leaflet-bar a:hover {
          background: #374151 !important;
        }
      `;
      document.head.appendChild(s);
    }

    fetch("/data/kerala-districts.geojson")
      .then((r) => r.json())
      .then((json: FeatureCollection) => setGeoData(json));

    return () => {
      tt.remove();
      tooltipRef.current = null;
    };
  }, []);

  // Update tooltip colours when theme changes
  useEffect(() => {
    const tt = tooltipRef.current;
    if (!tt) return;
    if (isDark) {
      tt.style.background = "#1f2937";
      tt.style.border = "1px solid #374151";
      tt.style.boxShadow = "0 4px 12px rgba(0,0,0,.4)";
      tt.style.color = "#f9fafb";
    } else {
      tt.style.background = "white";
      tt.style.border = "1px solid #d1d5db";
      tt.style.boxShadow = "0 4px 12px rgba(0,0,0,.15)";
      tt.style.color = "#111827";
    }
  }, [isDark]);

  const styleFeature = (
    feature?: Feature<Geometry, { shapeName: string }>,
  ): PathOptions => {
    const count = countMap.get(feature?.properties?.shapeName ?? "")?.count ?? 0;
    return {
      fillColor: getDistrictColor(count),
      fillOpacity: 0.82,
      color: isDark ? "#4b5563" : "#ffffff",
      weight: 1.5,
    };
  };

  const onEachFeature = (
    feature: Feature<Geometry, { shapeName: string }>,
    layer: Layer,
  ) => {
    const entry = countMap.get(feature.properties.shapeName);
    const count = entry?.count ?? 0;
    const displayName =
      locale === "ml"
        ? (entry?.name_ml ?? feature.properties.shapeName)
        : feature.properties.shapeName;

    (layer as unknown as {
      bindTooltip(content: string, opts: object): void;
    }).bindTooltip(displayName, {
      permanent: true,
      direction: "center",
      className: "district-label",
    });

    const ttRef = tooltipRef;

    layer.on({
      mouseover(e: LeafletMouseEvent) {
        (e.target as { setStyle(s: PathOptions): void }).setStyle({
          fillOpacity: 1,
          weight: 2.5,
          color: isDark ? "#4ade80" : "#15803d",
        });
        (e.target as { bringToFront(): void }).bringToFront();

        const tt = ttRef.current;
        if (!tt) return;
        const nameColor  = isDark ? "#f9fafb" : "#111827";
        const countColor = isDark ? "#9ca3af" : "#6b7280";
        tt.innerHTML =
          `<strong style="display:block;color:${nameColor};margin-bottom:2px">${displayName}</strong>` +
          `<span style="color:${countColor}">${count} FPO${count !== 1 ? "s" : ""}</span>`;
        tt.style.display = "block";
        tt.style.left = `${e.originalEvent.clientX + 14}px`;
        tt.style.top  = `${e.originalEvent.clientY - 10}px`;
      },
      mousemove(e: LeafletMouseEvent) {
        const tt = ttRef.current;
        if (!tt) return;
        tt.style.left = `${e.originalEvent.clientX + 14}px`;
        tt.style.top  = `${e.originalEvent.clientY - 10}px`;
      },
      mouseout(e: LeafletMouseEvent) {
        const tt = ttRef.current;
        if (tt) tt.style.display = "none";
        (e.target as { setStyle(s: PathOptions): void }).setStyle(
          styleFeature(feature),
        );
      },
    });
  };

  // Water background — changes with theme without remounting MapContainer
  const waterBg = isDark ? "#1e3a5f" : "#bfdbfe";

  if (!geoData) {
    return (
      <div className="flex-1 animate-pulse rounded-b-xl bg-muted" style={{ minHeight: MAP_MIN_HEIGHT }} />
    );
  }

  return (
    <div
      className="relative z-0 flex-1 overflow-hidden rounded-b-xl"
      style={{ minHeight: MAP_MIN_HEIGHT, background: waterBg }}
    >
      <MapContainer
        center={[10.85, 76.27]}
        zoom={7}
        scrollWheelZoom={false}
        zoomControl={true}
        attributionControl={false}
        // fills the wrapper (which grows with its card); transparent so the wrapper's waterBg shows through
        style={{ position: "absolute", inset: 0, background: "transparent" }}
      >
        <FitBounds geoData={geoData} />
        <GeoJSON
          // re-render layers when theme or data changes
          key={`${data.map((d) => `${d.name}:${d.count}`).join(",")}-${isDark}`}
          data={geoData}
          style={styleFeature as (feature?: Feature) => PathOptions}
          onEachFeature={onEachFeature as (feature: Feature, layer: Layer) => void}
        />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-5 left-5 z-[1000] rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-2 font-semibold text-[11px] text-foreground">FPOs Count</p>
        <div className="flex flex-col gap-1.5">
          {COLOR_SCALE.map((range) => (
            <div key={range.label} className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border"
                style={{ background: range.fill }}
              />
              <span className="text-[10.5px] text-muted-foreground">{range.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
