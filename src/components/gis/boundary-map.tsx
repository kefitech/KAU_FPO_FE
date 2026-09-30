"use client";

import { useEffect, useRef, useState } from "react";

import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/gis/leaflet-overrides.css";

import {
  Crosshair,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Route,
  Satellite,
  Search,
  Sprout,
  Type,
  Undo2,
  X,
} from "lucide-react";

import { MapToggleButton } from "@/components/gis/map-toggle-button";
import { getZones } from "@/lib/api/gis";
import { bindSoilRegionTooltip, getSoilTypeColor, makeSoilRegionStyle } from "@/lib/gis/soil-region-colors";
import { DEFAULT_ZONE_COLOR, ZONE_COLORS } from "@/lib/gis/zone-colors";
import type { ZoneFeatureCollection } from "@/types/gis";

/** The soil-region layer's shape (GET /gis/soil-regions/). */
export interface SoilRegionLayer {
  type: "FeatureCollection";
  features: { type: "Feature"; geometry: GeoJSON.Geometry; properties: { code: string; soil_type: string } }[];
}

type T = Record<string, string>;

export interface LatLng {
  lat: number;
  lng: number;
}

interface SearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

const KERALA_CENTER: [number, number] = [10.5276, 76.2144];

const vertexIcon = L.divIcon({
  className: "",
  html: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill="#16a34a" stroke="white" stroke-width="2"/>
  </svg>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const searchPinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#2563eb" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

const locationPinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#16a34a" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function MapClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) });
    },
  });
  return null;
}

function MapInstanceCapture({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

interface BoundaryMapProps {
  /** Boundary corners; drawn as a polygon once there are 3+. */
  vertices: LatLng[];
  /** Called for every corner added, dragged, removed or undone while drawing. */
  onVerticesChange: (vertices: LatLng[]) => void;
  isDrawing: boolean;
  onStartDrawing: () => void;
  /** Switches the draw button's label to "Redraw boundary". */
  hasArea: boolean;
  /** Optional single-point location (admin model test). Enables the "Drop a pin" control. */
  pin?: LatLng | null;
  onDropPin?: (p: LatLng) => void;
  /** Optional: enables a "Show soil zones" layer, loaded on first toggle. */
  loadSoilRegions?: () => Promise<SoilRegionLayer>;
  t: T;
}

/**
 * The GIS map used to mark a farm location: place search, zone overlay with
 * opacity + legend, street/satellite (with roads and place-name layers),
 * fullscreen, recenter, and boundary drawing with draggable, removable
 * corners. Stateless about what the boundary is FOR -- the FPO cultivation
 * area saves it, the admin model test looks it up.
 */
export function BoundaryMap({
  vertices,
  onVerticesChange,
  isDrawing,
  onStartDrawing,
  hasArea,
  pin = null,
  onDropPin,
  loadSoilRegions,
  t,
}: BoundaryMapProps) {
  const [zones, setZones] = useState<ZoneFeatureCollection | null>(null);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(false);
  const [zoneOpacity, setZoneOpacity] = useState(0.38);
  const [pinMode, setPinMode] = useState(false);

  const [soils, setSoils] = useState<SoilRegionLayer | null>(null);
  const [soilsLoading, setSoilsLoading] = useState(false);
  const [showSoils, setShowSoils] = useState(false);
  const [soilOpacity, setSoilOpacity] = useState(0.35);

  async function handleToggleSoils() {
    if (showSoils || !loadSoilRegions) {
      setShowSoils(false);
      return;
    }
    setShowSoils(true);
    if (soils) return;
    setSoilsLoading(true);
    setZonesError(null);
    try {
      setSoils(await loadSoilRegions());
    } catch {
      setZonesError("Could not load soil regions.");
      setShowSoils(false);
    } finally {
      setSoilsLoading(false);
    }
  }

  // One legend row per soil type (the palette colours by type, not region);
  // an unrecognised type falls back to its region code's colour.
  const soilLegend = Array.from(
    new Map(
      (soils?.features ?? []).map((f) => {
        const label = f.properties.soil_type || f.properties.code;
        return [label, { label, color: getSoilTypeColor(f.properties.soil_type, f.properties.code) }];
      }),
    ).values(),
  );

  const mapRef = useRef<L.Map | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite">("street");
  const [showRoads, setShowRoads] = useState(true);
  const [showPlaceNames, setShowPlaceNames] = useState(true);

  useEffect(() => {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === mapWrapperRef.current;
      setIsFullscreen(active);
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Starting to draw cancels a pending pin drop.
  useEffect(() => {
    if (isDrawing) setPinMode(false);
  }, [isDrawing]);

  function handleToggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mapWrapperRef.current?.requestFullscreen();
    }
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPin, setSearchPin] = useState<LatLng | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchOpen(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=in&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data: Array<{ display_name: string; lat: string; lon: string }> = await response.json();
      setSearchResults(
        data.map((item) => ({
          displayName: item.display_name,
          lat: Number.parseFloat(item.lat),
          lng: Number.parseFloat(item.lon),
        })),
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSelectSearchResult(result: SearchResult) {
    mapRef.current?.setView([result.lat, result.lng], 14);
    setSearchOpen(false);
    setSearchQuery(result.displayName.split(",")[0]);
    setSearchPin({ lat: result.lat, lng: result.lng });
  }

  function handleClearSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    setSearchPin(null);
  }

  async function handleToggleZones() {
    if (showZones) {
      setShowZones(false);
      return;
    }
    setShowZones(true);
    if (zones) return;
    setZonesLoading(true);
    setZonesError(null);
    try {
      const result = await getZones();
      setZones(result);
    } catch {
      setZonesError("Could not load zone boundaries.");
      setShowZones(false);
    } finally {
      setZonesLoading(false);
    }
  }

  function zoneStyle(feature?: GeoJSON.Feature) {
    const code = (feature?.properties as { code?: string } | undefined)?.code;
    const color = (code && ZONE_COLORS[code]) || DEFAULT_ZONE_COLOR;
    return { color, weight: 2, fillColor: color, fillOpacity: zoneOpacity };
  }

  function onEachZoneFeature(feature: GeoJSON.Feature, layer: L.Layer) {
    const props = feature.properties as { name_en?: string; soil_type?: string } | undefined;
    if (props?.name_en) {
      layer.bindTooltip(`<strong>${props.name_en}</strong>${props.soil_type ? `<br/>${props.soil_type}` : ""}`, {
        sticky: true,
      });
    }
  }

  function handleMapClick(p: LatLng) {
    if (isDrawing) {
      onVerticesChange([...vertices, p]);
    } else if (pinMode && onDropPin) {
      setPinMode(false);
      onDropPin(p);
    }
  }

  // Per-vertex "hover 1s -> show hint tooltip" timers, keyed by vertex
  // index. A marker click cancels any pending timer for that index so a
  // just-removed vertex never fires a tooltip on a detached marker later.
  const vertexHoverTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function handleVertexHoverStart(index: number, marker: L.Marker) {
    vertexHoverTimers.current[index] = setTimeout(() => {
      marker
        .bindTooltip(t.vertex_hint ?? "Drag to move · Click to remove", {
          direction: "top",
          offset: [0, -10],
        })
        .openTooltip();
    }, 1000);
  }

  function handleVertexHoverEnd(index: number, marker: L.Marker) {
    if (vertexHoverTimers.current[index]) {
      clearTimeout(vertexHoverTimers.current[index]);
      delete vertexHoverTimers.current[index];
    }
    marker.closeTooltip();
  }

  const hasTarget = vertices.length > 0 || pin !== null;

  function handleRecenter() {
    const map = mapRef.current;
    if (!map || !hasTarget) return;
    if (vertices.length >= 3) {
      const bounds = L.latLngBounds(vertices.map((v) => [v.lat, v.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (vertices.length > 0) {
      map.setView([vertices[0].lat, vertices[0].lng], 15);
    } else if (pin) {
      map.setView([pin.lat, pin.lng], 15);
    }
  }

  const start = vertices[0] ?? pin;
  const mapCenter: [number, number] = start ? [start.lat, start.lng] : KERALA_CENTER;

  return (
    <div className="flex flex-col gap-2">
      {zonesError && <p className="text-destructive text-xs">{zonesError}</p>}

      <div
        ref={mapWrapperRef}
        className={`relative isolate overflow-hidden rounded-lg border ${isFullscreen ? "h-screen" : "h-[28rem]"}`}
      >
        <MapContainer
          center={mapCenter}
          zoom={start ? 15 : 9}
          maxZoom={19}
          className="h-full w-full"
          style={{ zIndex: 0 }}
          zoomControl={false}
        >
          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomleft" imperial={false} />
          {baseLayer === "street" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          ) : (
            <>
              <TileLayer
                attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                maxNativeZoom={18}
              />
              {showRoads && (
                <TileLayer
                  attribution="Roads &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  maxNativeZoom={18}
                  zIndex={2}
                />
              )}
              {showPlaceNames && (
                <TileLayer
                  attribution="Labels &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  maxNativeZoom={18}
                  zIndex={3}
                />
              )}
            </>
          )}

          <MapInstanceCapture
            onReady={(map) => {
              mapRef.current = map;
            }}
          />
          <MapClickHandler onClick={handleMapClick} />

          {searchPin && <Marker position={[searchPin.lat, searchPin.lng]} icon={searchPinIcon} />}
          {pin && <Marker position={[pin.lat, pin.lng]} icon={locationPinIcon} />}

          {showZones && zones && (
            <GeoJSON
              key={`zones-on-${zoneOpacity}`}
              data={zones as unknown as GeoJSON.GeoJsonObject}
              style={zoneStyle}
              onEachFeature={onEachZoneFeature}
            />
          )}

          {showSoils && soils && (
            <GeoJSON
              key={`soils-on-${soilOpacity}`}
              data={soils as unknown as GeoJSON.GeoJsonObject}
              style={makeSoilRegionStyle(soilOpacity)}
              onEachFeature={bindSoilRegionTooltip}
            />
          )}

          {vertices.length >= 3 && (
            <Polygon
              positions={vertices.map((v) => [v.lat, v.lng])}
              pathOptions={{ color: "#16a34a", fillOpacity: 0.2 }}
            />
          )}

          {isDrawing &&
            vertices.map((v, i) => (
              <Marker
                // biome-ignore lint/suspicious/noArrayIndexKey: corners have no identity beyond their order
                key={i}
                position={[v.lat, v.lng]}
                icon={vertexIcon}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const pos = (e.target as L.Marker).getLatLng();
                    const moved = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
                    onVerticesChange(vertices.map((old, j) => (j === i ? moved : old)));
                  },
                  click(e) {
                    // Interactive Leaflet layers don't bubble click to the
                    // map by default, so this doesn't also add a new point
                    // at the same spot via MapClickHandler.
                    handleVertexHoverEnd(i, e.target as L.Marker);
                    onVerticesChange(vertices.filter((_, j) => j !== i));
                  },
                  mouseover(e) {
                    handleVertexHoverStart(i, e.target as L.Marker);
                  },
                  mouseout(e) {
                    handleVertexHoverEnd(i, e.target as L.Marker);
                  },
                }}
              />
            ))}
        </MapContainer>

        <div className="absolute top-2 left-2 z-[400] flex flex-col gap-1">
          <button
            type="button"
            onClick={handleToggleZones}
            disabled={zonesLoading}
            className="flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 font-medium text-xs shadow-md backdrop-blur-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {zonesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
            {showZones ? (t.map_hide_zones ?? "Hide zones") : (t.map_show_zones ?? "Show zones")}
          </button>
          {showZones && (
            <div className="flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 shadow-md backdrop-blur-sm">
              <span className="text-[10px] text-muted-foreground">{t.map_opacity ?? "Opacity"}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={zoneOpacity}
                onChange={(e) => setZoneOpacity(Number.parseFloat(e.target.value))}
                className="h-1 w-20 accent-primary"
              />
            </div>
          )}
          {loadSoilRegions && (
            <button
              type="button"
              onClick={handleToggleSoils}
              disabled={soilsLoading}
              className="flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 font-medium text-xs shadow-md backdrop-blur-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {soilsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sprout className="h-3.5 w-3.5" />}
              {showSoils ? (t.map_hide_soil ?? "Hide soil zones") : (t.map_show_soil ?? "Show soil zones")}
            </button>
          )}
          {showSoils && (
            <div className="flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 shadow-md backdrop-blur-sm">
              <span className="text-[10px] text-muted-foreground">{t.map_opacity ?? "Opacity"}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soilOpacity}
                onChange={(e) => setSoilOpacity(Number.parseFloat(e.target.value))}
                className="h-1 w-20 accent-primary"
              />
            </div>
          )}
          {!isDrawing && (
            <button
              type="button"
              onClick={onStartDrawing}
              className="flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 font-medium text-primary text-xs shadow-md backdrop-blur-sm hover:bg-background"
            >
              <MapPin className="h-3.5 w-3.5" />
              {hasArea ? (t.btn_redraw_boundary ?? "Redraw boundary") : (t.btn_draw_boundary ?? "Draw boundary")}
            </button>
          )}
          {!isDrawing && onDropPin && (
            <button
              type="button"
              onClick={() => setPinMode((v) => !v)}
              aria-pressed={pinMode}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-medium text-xs shadow-md backdrop-blur-sm ${
                pinMode
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-background/90 text-primary hover:bg-background"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {pinMode ? "Cancel pin" : pin ? "Move pin" : "Drop a pin"}
            </button>
          )}
          {isDrawing && (
            <button
              type="button"
              onClick={() => onVerticesChange(vertices.slice(0, -1))}
              disabled={vertices.length === 0}
              className="flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 font-medium text-xs shadow-md backdrop-blur-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t.btn_undo_point ?? "Undo point"}
            </button>
          )}
        </div>

        <div className="absolute top-2 left-1/2 z-[400] w-56 -translate-x-1/2">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <div className="flex flex-1 items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 shadow-sm backdrop-blur-sm">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder={t.search_placeholder ?? "Search a place…"}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {searchOpen && (
            <div className="mt-1 max-h-56 overflow-y-auto rounded-md border bg-background/95 shadow-sm backdrop-blur-sm">
              {searchLoading ? (
                <div className="flex items-center justify-center gap-1.5 px-3 py-3 text-muted-foreground text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t.search_searching ?? "Searching…"}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.lat},${result.lng}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(result)}
                    className="block w-full truncate border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted"
                    title={result.displayName}
                  >
                    {result.displayName}
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-center text-muted-foreground text-xs">
                  {t.search_no_results ?? "No places found."}
                </div>
              )}
            </div>
          )}
        </div>

        {hasTarget && (
          <button
            type="button"
            onClick={handleRecenter}
            title={t.map_recenter_tooltip ?? "Recenter on my farm boundary"}
            className="absolute top-2 right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleFullscreen}
          title={
            isFullscreen ? (t.map_exit_fullscreen_tooltip ?? "Exit fullscreen") : (t.map_expand_tooltip ?? "Expand map")
          }
          className={`absolute right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background ${
            hasTarget ? "top-12" : "top-2"
          }`}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setBaseLayer((prev) => (prev === "street" ? "satellite" : "street"))}
          title={
            baseLayer === "street"
              ? (t.map_satellite_tooltip ?? "Switch to satellite view")
              : (t.map_street_tooltip ?? "Switch to street view")
          }
          className={`absolute right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background ${
            hasTarget ? "top-[5.5rem]" : "top-12"
          }`}
        >
          <Satellite className="h-4 w-4" />
        </button>

        {baseLayer === "satellite" && (
          <>
            <MapToggleButton
              active={showRoads}
              onClick={() => setShowRoads((v) => !v)}
              title={showRoads ? (t.map_roads_hide ?? "Hide roads") : (t.map_roads_show ?? "Show roads")}
              className={hasTarget ? "top-[8rem]" : "top-[5.5rem]"}
            >
              <Route className="h-4 w-4" />
            </MapToggleButton>
            <MapToggleButton
              active={showPlaceNames}
              onClick={() => setShowPlaceNames((v) => !v)}
              title={
                showPlaceNames ? (t.map_labels_hide ?? "Hide place names") : (t.map_labels_show ?? "Show place names")
              }
              className={hasTarget ? "top-[10.5rem]" : "top-[8rem]"}
            >
              <Type className="h-4 w-4" />
            </MapToggleButton>
          </>
        )}

        {((showZones && zones) || (showSoils && soils)) && (
          <div className="pointer-events-none absolute bottom-8 left-2 z-[400] flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border bg-background/90 px-2 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
            {showZones && zones && (
              <>
                {showSoils && soils && <span className="font-medium text-foreground">{t.legend_zones ?? "Zones"}</span>}
                {Object.entries(ZONE_COLORS).map(([code, color]) => (
                  <div key={code} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-muted-foreground capitalize">{code.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </>
            )}
            {showSoils && soils && (
              <>
                {showZones && zones && (
                  <span className="mt-1 font-medium text-foreground">{t.legend_soil ?? "Soil zones"}</span>
                )}
                {soilLegend.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {((isDrawing && vertices.length === 0) || pinMode) && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-lg border bg-background/90 px-3 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {pinMode
                ? "Click on the map to drop the pin"
                : (t.boundary_click_prompt ?? "Click on the map to start marking your boundary")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
