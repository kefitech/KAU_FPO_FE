"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "leaflet/dist/leaflet.css";

import { useQuery } from "@tanstack/react-query";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type {
  LatLng,
  LatLngBounds,
  Layer,
  GeoJSON as LeafletGeoJSON,
  Map as LeafletMap,
  LeafletMouseEvent,
  PathOptions,
  Point,
} from "leaflet";
import { ArrowLeft, MapPin } from "lucide-react";
import { GeoJSON, MapContainer, Pane, useMap } from "react-leaflet";

import { adminDashboardApi } from "@/app/admin/_api/dashboard";
import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

// ── Color scale ────────────────────────────────────────────────────────────────

const COLOR_SCALE = [
  { min: 100, fill: "#15803d", label: "100 and above" },
  { min: 50,  fill: "#4ade80", label: "50 – 100" },
  { min: 20,  fill: "#fde047", label: "20 – 50" },
  { min: 10,  fill: "#fb923c", label: "10 – 20" },
  { min: 0,   fill: "#f87171", label: "Below 10" },
] as const;

// A block holds far fewer FPOs than a district, so blocks get their own buckets.
const BLOCK_COLOR_SCALE = [
  { min: 10, fill: "#15803d", label: "10 and above" },
  { min: 5,  fill: "#4ade80", label: "5 – 10" },
  { min: 3,  fill: "#fde047", label: "3 – 5" },
  { min: 1,  fill: "#fb923c", label: "1 – 3" },
] as const;

function getDistrictColor(count: number): string {
  for (const range of COLOR_SCALE) {
    if (count >= range.min) return range.fill;
  }
  return "#f87171";
}

function getBlockColor(count: number, isDark: boolean): string {
  for (const range of BLOCK_COLOR_SCALE) {
    if (count >= range.min) return range.fill;
  }
  return isDark ? "#374151" : "#e5e7eb";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// ── FitBounds ──────────────────────────────────────────────────────────────────

const FIT_PADDING = 20;
const ZOOM_DURATION_MS = 800;
// How far a pan between two same-zoom districts pulls back mid-way (zoom levels)
const PAN_ZOOM_DIP = 0.35;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// Leaflet's flyTo always eases out, so the zoom drives the same internal steps flyTo
// uses (_moveStart, a _move per frame, _moveEnd) on an ease-in-out curve instead.
type AnimatableMap = LeafletMap & {
  _stop(): LeafletMap;
  _moveStart(zoomChanged: boolean, noMoveStart: boolean): LeafletMap;
  _move(center: LatLng, zoom: number, data?: object): LeafletMap;
  _moveEnd(zoomChanged: boolean): LeafletMap;
};

/** Moves the map and redraws every shape and label at the new view. */
function moveAndRedraw(m: AnimatableMap, center: LatLng, zoom: number) {
  m._move(center, zoom, { flyTo: true });
  // Leaflet only redraws shapes when a move ends — mid-move it scales and shifts the last
  // drawing, which blurs or blocks up when zooming and runs off its edge when panning.
  // A view reset redraws now; cheap enough per frame with the simplified district file.
  m.fire("viewreset");
}

/**
 * Eases `map` in and out to fit `bounds`, calling `onDone` when it gets there.
 * Returns a function that stops it where it is (without calling `onDone`).
 */
function zoomToBounds(map: LeafletMap, bounds: LatLngBounds, padding: Point, onDone: () => void): () => void {
  const m = map as AnimatableMap;
  m._stop();

  // Work in pixel space at the starting zoom
  const z0 = map.getZoom();
  const z1 = map.getBoundsZoom(bounds, false, padding);
  const from = map.project(map.getCenter(), z0);
  const to = map.project(bounds.getSouthWest(), z0).add(map.project(bounds.getNorthEast(), z0)).divideBy(2);

  // Zoom about the one map point that stays put on screen, so the district grows out of its
  // own spot. District to district at the same zoom has no such point: pan, pulling back a little.
  const scale = 2 ** (z1 - z0);
  const pivot = Math.abs(scale - 1) > 0.01 ? to.multiplyBy(scale).subtract(from).divideBy(scale - 1) : null;

  let frame = 0;
  let stopped = false;
  const step = (now: number) => {
    if (stopped) return;
    const t = Math.min((now - start) / ZOOM_DURATION_MS, 1);
    if (t === 1) {
      stopped = true;
      moveAndRedraw(m, map.unproject(to, z0), z1);
      m._moveEnd(true);
      onDone();
      return;
    }
    const e = easeInOutCubic(t);
    let zoom = z0 + (z1 - z0) * e;
    let center: Point;
    if (pivot) {
      center = pivot.subtract(pivot.subtract(from).divideBy(2 ** (zoom - z0)));
    } else {
      zoom -= PAN_ZOOM_DIP * Math.sin(Math.PI * t);
      center = from.add(to.subtract(from).multiplyBy(e));
    }
    moveAndRedraw(m, map.unproject(center, z0), zoom);
    frame = requestAnimationFrame(step);
  };

  const start = performance.now();
  m._moveStart(true, false);
  frame = requestAnimationFrame(step);

  return () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    m._moveEnd(true);
  };
}

/** Fits the map to `geoData` — eased after the first fit — and reports each fit it completes. */
function FitBounds({
  geoData,
  onFitted,
}: {
  geoData: FeatureCollection;
  onFitted?: (geoData: FeatureCollection) => void;
}) {
  const map = useMap();
  const fittedRef = useRef(false);
  const sizeRef = useRef({ width: 0, height: 0 });
  const onFittedRef = useRef(onFitted);
  useEffect(() => {
    onFittedRef.current = onFitted;
  });

  useEffect(() => {
    let active = true;
    let bounds: LatLngBounds | null = null;
    let stopZoom: (() => void) | null = null;
    const fit = () => {
      stopZoom?.();
      stopZoom = null;
      if (!bounds?.isValid()) return;
      map.fitBounds(bounds, { padding: [FIT_PADDING, FIT_PADDING] });
      onFittedRef.current?.(geoData);
    };
    import("leaflet").then((L) => {
      if (!active) return;
      bounds = L.geoJSON(geoData).getBounds();
      // Page load fits instantly; drilling into or out of a district eases between the views
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!fittedRef.current || reduceMotion || !bounds.isValid()) {
        fittedRef.current = true;
        fit();
        return;
      }
      stopZoom = zoomToBounds(map, bounds, L.point(FIT_PADDING * 2, FIT_PADDING * 2), () => {
        stopZoom = null;
        onFittedRef.current?.(geoData);
      });
    });
    // The map stretches to its dashboard row, whose height settles as the other cards
    // load — Leaflet doesn't notice container resizes, so tell it and refit. Only on a
    // real size change: the observer also reports once on observe, which would cut a zoom short.
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width === sizeRef.current.width && height === sizeRef.current.height) return;
      sizeRef.current = { width, height };
      map.invalidateSize();
      fit();
    });
    observer.observe(map.getContainer());
    return () => {
      active = false;
      observer.disconnect();
      stopZoom?.();
    };
  }, [map, geoData]);
  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DistrictEntry {
  code: string;
  name: string;
  name_ml: string;
  count: number;
}

export interface BlockEntry {
  code: string;
  name: string;
  count: number;
}

interface Props {
  data: DistrictEntry[];
  locale?: string;
  t?: Record<string, string>;
  /** Zooming into a district to see its blocks, then clicking a block to list its FPOs. */
  drilldown?: {
    district: string | null;
    block: string | null;
    onDistrictChange: (code: string | null) => void;
    onBlockSelect: (block: BlockEntry) => void;
    /** Whether clicking a district on the map opens it — off for sub-admins limited to their own. */
    clickToOpen: boolean;
    /** Sub-admins: a button that opens their assigned district. */
    homeDistrict?: { code: string; name: string };
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

// The map grows past this to match the height of the cards beside it.
const MAP_MIN_HEIGHT = "min(360px, 75vw)";

// District and block boundaries in one file, told apart by `level`. Each district is the union
// of its blocks (built by scripts/build_boundaries_geojson.py), so their borders coincide exactly.
type DistrictProps = { level: "district"; code: string; name: string };
type BlockProps = { level: "block"; code: string; district: string };

export function KeralaDistrictMap({ data, locale, t = {}, drilldown }: Props) {
  const [boundaries, setBoundaries] = useState<FeatureCollection | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const blockLayerRef = useRef<LeafletGeoJSON | null>(null);

  const isDark = usePreferencesStore((s) => s.resolvedThemeMode === "dark");

  // Computed synchronously during render so styleFeature/onEachFeature always see current data
  const countMap = useMemo(() => new Map(data.map((d) => [d.code, d])), [data]);

  const selectedDistrict = drilldown?.district ?? null;
  const selectedBlock = drilldown?.block ?? null;

  const geoData = useMemo<FeatureCollection | null>(
    () =>
      boundaries && {
        type: "FeatureCollection",
        features: boundaries.features.filter((f) => f.properties?.level === "district"),
      },
    [boundaries],
  );

  const blockGeo = useMemo<FeatureCollection | null>(
    () =>
      boundaries && selectedDistrict
        ? {
            type: "FeatureCollection",
            features: boundaries.features.filter(
              (f) => f.properties?.level === "block" && f.properties.district === selectedDistrict,
            ),
          }
        : null,
    [boundaries, selectedDistrict],
  );

  const { data: blockStats } = useQuery({
    queryKey: ["admin-dashboard-district-blocks", selectedDistrict, locale],
    queryFn: () => adminDashboardApi.getDistrictBlocks(selectedDistrict as string),
    enabled: !!selectedDistrict,
    staleTime: 5 * 60 * 1000,
  });

  const blockMap = useMemo(
    () => new Map((blockStats?.blocks ?? []).map((b) => [b.code, b])),
    [blockStats],
  );
  const blocksReady = !!selectedDistrict && !!blockGeo && !!blockStats;
  // Zoom to the district's outline — the same area its blocks cover
  const selectedDistrictGeo = useMemo<FeatureCollection | null>(() => {
    if (!geoData || !selectedDistrict) return null;
    return {
      type: "FeatureCollection",
      features: geoData.features.filter((f) => f.properties?.code === selectedDistrict),
    };
  }, [geoData, selectedDistrict]);

  // Blocks join the map once the zoom into their district has finished — added mid-zoom they'd
  // be drawn at the wrong scale until it ends
  const [fittedTo, setFittedTo] = useState<FeatureCollection | null>(null);
  const showBlocks = blocksReady && fittedTo === selectedDistrictGeo;

  useEffect(() => {
    // Floating hover tooltip
    const tt = document.createElement("div");
    tt.style.cssText =
      "position:fixed;z-index:9999;pointer-events:none;" +
      "border-radius:8px;padding:7px 11px;" +
      "font-family:system-ui,sans-serif;font-size:13px;line-height:1.4;display:none;";
    document.body.appendChild(tt);
    tooltipRef.current = tt;

    // District name label CSS — rewritten on every mount, so a tab that loaded an older
    // version of these rules (the element outlives client-side navigation) picks up the new ones
    let s = document.getElementById("kau-district-label-css");
    if (!s) {
      s = document.createElement("style");
      s.id = "kau-district-label-css";
      document.head.appendChild(s);
    }
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

        /* Drill-down: the district cross-fades into its blocks once the zoom settles */
        .leaflet-district-blocks-pane path { animation: kau-map-fade-in 0.3s ease-out; }
        .kau-district-fade-out { animation: kau-map-fade-out 0.3s ease-out forwards; }
        @keyframes kau-map-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kau-map-fade-out { from { opacity: 1; } to { opacity: 0; } }

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

    fetch("/data/kerala-boundaries.geojson")
      .then((r) => r.json())
      .then((json: FeatureCollection) => setBoundaries(json));

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

  const moveTooltip = (e: LeafletMouseEvent) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    tt.style.left = `${e.originalEvent.clientX + 14}px`;
    tt.style.top  = `${e.originalEvent.clientY - 10}px`;
  };

  const showTooltip = (e: LeafletMouseEvent, title: string, count: number) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    const nameColor  = isDark ? "#f9fafb" : "#111827";
    const countColor = isDark ? "#9ca3af" : "#6b7280";
    tt.innerHTML =
      `<strong style="display:block;color:${nameColor};margin-bottom:2px">${escapeHtml(title)}</strong>` +
      `<span style="color:${countColor}">${count} FPO${count !== 1 ? "s" : ""}</span>`;
    tt.style.display = "block";
    moveTooltip(e);
  };

  const hideTooltip = () => {
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  };

  // ── District layer ──────────────────────────────────────────────────────────

  const styleFeature = (feature?: Feature<Geometry, DistrictProps>): PathOptions => {
    const code = feature?.properties?.code ?? "";
    const count = countMap.get(code)?.count ?? 0;
    const base: PathOptions = {
      fillColor: getDistrictColor(count),
      fillOpacity: 0.82,
      color: isDark ? "#4b5563" : "#ffffff",
      weight: 1.5,
    };
    if (!selectedDistrict) return base;
    // Drilled in: the selected district gives way to its blocks, the rest fade back.
    if (code === selectedDistrict) {
      return showBlocks ? { ...base, className: "kau-district-fade-out" } : base;
    }
    return { ...base, fillOpacity: 0.3 };
  };

  const onEachFeature = (feature: Feature<Geometry, DistrictProps>, layer: Layer) => {
    const { code, name } = feature.properties;
    const entry = countMap.get(code);
    const count = entry?.count ?? 0;
    const displayName = locale === "ml" ? (entry?.name_ml ?? name) : name;

    // The selected district's blocks take over its label spot
    if (!(selectedDistrict && code === selectedDistrict)) {
      (layer as unknown as {
        bindTooltip(content: string, opts: object): void;
      }).bindTooltip(displayName, {
        permanent: true,
        direction: "center",
        className: "district-label",
      });
    }

    layer.on({
      mouseover(e: LeafletMouseEvent) {
        (e.target as { setStyle(s: PathOptions): void }).setStyle({
          fillOpacity: 1,
          weight: 2.5,
          color: isDark ? "#4ade80" : "#15803d",
        });
        (e.target as { bringToFront(): void }).bringToFront();
        showTooltip(e, displayName, count);
      },
      mousemove: moveTooltip,
      mouseout(e: LeafletMouseEvent) {
        hideTooltip();
        (e.target as { setStyle(s: PathOptions): void }).setStyle(
          styleFeature(feature),
        );
      },
      click() {
        if (!drilldown?.clickToOpen || code === selectedDistrict) return;
        // The layers are rebuilt for the new district, so this one never gets its mouseout
        hideTooltip();
        drilldown.onDistrictChange(code);
      },
    });
  };

  // ── Block layer (drill-down) ────────────────────────────────────────────────

  const styleBlock = useCallback(
    (feature?: Feature<Geometry, BlockProps>): PathOptions => {
      const code = feature?.properties?.code ?? "";
      const selected = code === selectedBlock;
      return {
        fillColor: getBlockColor(blockMap.get(code)?.count ?? 0, isDark),
        fillOpacity: 0.85,
        color: selected ? (isDark ? "#4ade80" : "#15803d") : (isDark ? "#4b5563" : "#ffffff"),
        weight: selected ? 3 : 1,
      };
    },
    [blockMap, isDark, selectedBlock],
  );

  // Layer handlers are bound once per block layer; read the latest style/callback through refs
  const styleBlockRef = useRef(styleBlock);
  const onBlockSelectRef = useRef(drilldown?.onBlockSelect);
  useEffect(() => {
    styleBlockRef.current = styleBlock;
    onBlockSelectRef.current = drilldown?.onBlockSelect;
  });

  const bringSelectedBlockToFront = useCallback(() => {
    blockLayerRef.current?.eachLayer((l) => {
      const f = (l as unknown as { feature?: Feature<Geometry, BlockProps> }).feature;
      if (f?.properties.code === selectedBlock) (l as unknown as { bringToFront(): void }).bringToFront();
    });
  }, [selectedBlock]);

  // Keep the selected block's thick border on top of its neighbours'
  useEffect(() => {
    bringSelectedBlockToFront();
  }, [bringSelectedBlockToFront]);

  const onEachBlock = (feature: Feature<Geometry, BlockProps>, layer: Layer) => {
    const code = feature.properties.code;
    const entry = blockMap.get(code) ?? { code, name: code, count: 0 };

    if (code === selectedBlock) {
      layer.on("add", () => (layer as unknown as { bringToFront(): void }).bringToFront());
    }

    layer.on({
      mouseover(e: LeafletMouseEvent) {
        (e.target as { setStyle(s: PathOptions): void }).setStyle({
          fillOpacity: 1,
          weight: 2.5,
          color: isDark ? "#4ade80" : "#15803d",
        });
        (e.target as { bringToFront(): void }).bringToFront();
        showTooltip(e, entry.name, entry.count);
      },
      mousemove: moveTooltip,
      mouseout(e: LeafletMouseEvent) {
        hideTooltip();
        (e.target as { setStyle(s: PathOptions): void }).setStyle(styleBlockRef.current(feature));
        bringSelectedBlockToFront();
      },
      click() {
        onBlockSelectRef.current?.(entry);
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

  const fitTarget = selectedDistrictGeo ?? geoData;

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
        <FitBounds geoData={fitTarget} onFitted={setFittedTo} />
        <GeoJSON
          // re-render layers when theme, data or the drilled-in district changes
          key={`${data.map((d) => `${d.name}:${d.count}`).join(",")}-${isDark}-${selectedDistrict}-${showBlocks}`}
          data={geoData}
          style={styleFeature as (feature?: Feature) => PathOptions}
          onEachFeature={onEachFeature as (feature: Feature, layer: Layer) => void}
        />
        {/* Own pane above the district layer, so a rebuilt district layer never covers the blocks */}
        <Pane name="district-blocks" style={{ zIndex: 450 }}>
          {showBlocks && (
            <GeoJSON
              ref={blockLayerRef}
              // a new selection only restyles (via `style`), so the hovered block keeps its hover state
              key={`${selectedDistrict}-${isDark}-${blockStats.blocks.map((b) => `${b.code}:${b.count}`).join(",")}`}
              data={blockGeo}
              style={styleBlock as (feature?: Feature) => PathOptions}
              onEachFeature={onEachBlock as (feature: Feature, layer: Layer) => void}
            />
          )}
        </Pane>
      </MapContainer>

      {selectedDistrict && (
        <Button
          size="sm"
          variant="outline"
          className="absolute top-3 right-3 z-[1000] h-8 bg-background/95 shadow-sm backdrop-blur-sm"
          onClick={() => {
            hideTooltip();
            drilldown?.onDistrictChange(null);
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.map_back_to_kerala ?? "Back to Kerala"}
        </Button>
      )}

      {!selectedDistrict && drilldown?.homeDistrict && (
        <Button
          size="sm"
          variant="outline"
          className="absolute top-3 right-3 z-[1000] h-8 bg-background/95 shadow-sm backdrop-blur-sm"
          onClick={() => drilldown.onDistrictChange(drilldown.homeDistrict?.code ?? null)}
        >
          <MapPin className="h-3.5 w-3.5" />
          {(t.map_view_district ?? "View {district}").replace("{district}", drilldown.homeDistrict.name)}
        </Button>
      )}

      {blocksReady && blockStats.unassigned > 0 && (
        <div className="absolute right-3 bottom-5 z-[1000] rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-[10.5px] text-muted-foreground shadow-sm backdrop-blur-sm">
          {(t.map_unassigned ?? "FPOs without a matching block: {n}").replace("{n}", String(blockStats.unassigned))}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-5 left-5 z-[1000] rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        {selectedDistrict ? (
          <>
            <p className="mb-2 font-semibold text-[11px] text-foreground">{t.map_legend_block ?? "FPOs per block"}</p>
            <div className="flex flex-col gap-1.5">
              {[
                ...BLOCK_COLOR_SCALE.map((range) => ({ label: range.label, fill: range.fill as string })),
                { label: t.map_legend_none ?? "None", fill: getBlockColor(0, isDark) },
              ].map((range) => (
                <div key={range.label} className="flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border"
                    style={{ background: range.fill }}
                  />
                  <span className="text-[10.5px] text-muted-foreground">{range.label}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
