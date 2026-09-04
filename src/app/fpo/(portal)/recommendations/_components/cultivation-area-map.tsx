"use client";

import { useEffect, useRef, useState } from "react";

import L from "leaflet";
import { GeoJSON, MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  CheckCircle2,
  CloudSun,
  Crosshair,
  Droplets,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Satellite,
  Search,
  Sprout,
  Thermometer,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { deleteCultivationArea, getCultivationArea, getWeather, getZones, refreshWeather, saveCultivationArea } from "@/lib/api/gis";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { CultivationAreaFeature, SaveCultivationAreaRequest, WeatherSnapshot, ZoneFeatureCollection } from "@/types/gis";

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

const ZONE_COLORS: Record<string, string> = {
  coastal_zone: "#1D9E75",
  high_ranges: "#7F77DD",
  southern_zone: "#D85A30",
  central_zone: "#BA7517",
  northern_zone: "#888780",
};
const DEFAULT_ZONE_COLOR = "#888780";

function verticesToRequest(vertices: LatLng[]): SaveCultivationAreaRequest {
  const ring = vertices.map((v) => [v.lng, v.lat] as [number, number]);
  ring.push(ring[0]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {},
  };
}

function featureToVertices(feature: CultivationAreaFeature): LatLng[] {
  const ring = feature.geometry.coordinates[0]?.[0] ?? [];
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

function DrawClickHandler({ active, onAddPoint }: { active: boolean; onAddPoint: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onAddPoint({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) });
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

interface WeatherCardProps {
  weather: WeatherSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  t: T;
}

function WeatherCard({ weather, loading, refreshing, error, onRefresh, t }: WeatherCardProps) {
  const SEASON_LABELS: Record<string, string> = {
    southwest_monsoon: t.season_sw_monsoon ?? "South-West Monsoon",
    northeast_monsoon: t.season_ne_monsoon ?? "North-East Monsoon",
    dry_season: t.season_dry ?? "Dry Season",
  };

  if (loading) {
    return (
      <div className="flex h-20 items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-medium text-sm">
          <CloudSun className="h-4 w-4 text-muted-foreground" />
          {t.weather_title ?? "Weather & Season"}
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-primary text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {t.weather_refresh ?? "Refresh"}
        </button>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      {weather ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{weather.temperature_c ?? "—"}°C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{weather.humidity_percent ?? "—"}% humidity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CloudSun className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{weather.rainfall_mm ?? "—"} mm rain</span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            {SEASON_LABELS[weather.season] ?? weather.season} — {weather.description}
          </p>
          {weather.is_simulated && (
            <p className="text-[10px] text-muted-foreground/70 italic">
              {t.weather_simulated_note ?? "Estimated from seasonal patterns, not a live forecast."}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-xs">
          {t.weather_no_data ?? "No weather data yet."}{" "}
          <button type="button" onClick={onRefresh} className="text-primary hover:underline">
            {t.weather_check_now ?? "Check now"}
          </button>
        </p>
      )}
    </div>
  );
}

export function CultivationAreaMap() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_gis")
      .then((data) => setT(data.fpo_gis ?? {}))
      .catch(() => undefined);
  }, [locale]);

  const [vertices, setVertices] = useState<LatLng[]>([]);
  const [savedArea, setSavedArea] = useState<CultivationAreaFeature | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [zones, setZones] = useState<ZoneFeatureCollection | null>(null);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite">("street");

  useEffect(() => {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === mapWrapperRef.current;
      setIsFullscreen(active);
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  async function loadCachedWeather() {
    try {
      const result = await getWeather();
      setWeather(result);
    } catch {
      setWeatherError(t.weather_error_load ?? "Could not load weather.");
    } finally {
      setWeatherLoading(false);
    }
  }

  async function handleWeatherRefresh() {
    setWeatherRefreshing(true);
    setWeatherError(null);
    try {
      const result = await refreshWeather();
      setWeather(result);
    } catch {
      setWeatherError(t.weather_error ?? "Could not fetch weather. Please try again.");
    } finally {
      setWeatherRefreshing(false);
    }
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
    return { color, weight: 2, fillColor: color, fillOpacity: 0.38 };
  }

  function onEachZoneFeature(feature: GeoJSON.Feature, layer: L.Layer) {
    const props = feature.properties as { name_en?: string; soil_type?: string } | undefined;
    if (props?.name_en) {
      layer.bindTooltip(`<strong>${props.name_en}</strong>${props.soil_type ? `<br/>${props.soil_type}` : ""}`, { sticky: true });
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const area = await getCultivationArea();
        if (cancelled) return;
        if (area) {
          setSavedArea(area);
          setVertices(featureToVertices(area));
        }
      } catch {
        if (!cancelled) setError(t.error_load_area ?? "Could not load your saved cultivation area.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    loadCachedWeather();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartDrawing() {
    setError(null);
    setIsDrawing(true);
    setVertices([]);
  }

  function handleUndoLastPoint() {
    setVertices((prev) => prev.slice(0, -1));
  }

  function handleClearDrawing() {
    setIsDrawing(false);
    setVertices(savedArea ? featureToVertices(savedArea) : []);
  }

  function handleVertexDrag(index: number, newPos: LatLng) {
    setVertices((prev) => prev.map((v, i) => (i === index ? newPos : v)));
  }

  function handleRecenter() {
    const map = mapRef.current;
    if (!map || vertices.length === 0) return;
    if (vertices.length >= 3) {
      const bounds = L.latLngBounds(vertices.map((v) => [v.lat, v.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      map.setView([vertices[0].lat, vertices[0].lng], 15);
    }
  }

  async function handleSave() {
    if (vertices.length < 3) return;
    setSaving(true);
    setError(null);
    try {
      const request = verticesToRequest(vertices);
      const saved = await saveCultivationArea(request);
      setSavedArea(saved);
      setVertices(featureToVertices(saved));
      setIsDrawing(false);
      handleWeatherRefresh();
    } catch {
      setError(t.error_save_area ?? "Could not save your cultivation area. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await deleteCultivationArea();
      setSavedArea(null);
      setVertices([]);
      setIsDrawing(false);
      handleWeatherRefresh();
    } catch {
      setError(t.error_delete_area ?? "Could not delete your cultivation area. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canFinish = isDrawing && vertices.length >= 3;
  const mapCenter: [number, number] = vertices[0] ? [vertices[0].lat, vertices[0].lng] : KERALA_CENTER;

  if (loading) {
    return (
      <div className="flex h-[28rem] items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <WeatherCard
        weather={weather}
        loading={weatherLoading}
        refreshing={weatherRefreshing}
        error={weatherError}
        onRefresh={handleWeatherRefresh}
        t={t}
      />

      <p className="text-muted-foreground text-xs">
        {isDrawing
          ? (t.draw_instruction ?? "Click the map to place each corner of your farm boundary.")
          : savedArea
            ? (t.draw_saved ?? "This is your saved cultivation area.")
            : (t.draw_prompt ?? "Draw your farm's boundary to help us give more accurate recommendations.")}
      </p>

      {zonesError && <p className="text-destructive text-xs">{zonesError}</p>}

      <div
        ref={mapWrapperRef}
        className={`relative isolate overflow-hidden rounded-lg border ${isFullscreen ? "h-screen" : "h-[28rem]"}`}
      >
        <MapContainer
          center={mapCenter}
          zoom={vertices[0] ? 15 : 9}
          maxZoom={19}
          className="h-full w-full"
          style={{ zIndex: 0 }}
          zoomControl={false}
        >
          <ZoomControl position="bottomright" />
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
              />
              <TileLayer
                attribution="Labels &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </>
          )}

          <MapInstanceCapture onReady={(map) => { mapRef.current = map; }} />
          <DrawClickHandler active={isDrawing} onAddPoint={(p) => setVertices((prev) => [...prev, p])} />

          {searchPin && <Marker position={[searchPin.lat, searchPin.lng]} icon={searchPinIcon} />}

          {showZones && zones && (
            <GeoJSON
              key={showZones ? "zones-on" : "zones-off"}
              data={zones as unknown as GeoJSON.GeoJsonObject}
              style={zoneStyle}
              onEachFeature={onEachZoneFeature}
            />
          )}

          {vertices.length >= 3 && (
            <Polygon positions={vertices.map((v) => [v.lat, v.lng])} pathOptions={{ color: "#16a34a", fillOpacity: 0.2 }} />
          )}

          {isDrawing &&
            vertices.map((v, i) => (
              <Marker
                key={i}
                position={[v.lat, v.lng]}
                icon={vertexIcon}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const pos = (e.target as L.Marker).getLatLng();
                    handleVertexDrag(i, { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) });
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
          {!isDrawing && (
            <button
              type="button"
              onClick={handleStartDrawing}
              className="flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1.5 font-medium text-primary text-xs shadow-md backdrop-blur-sm hover:bg-background"
            >
              <MapPin className="h-3.5 w-3.5" />
              {savedArea ? (t.btn_redraw_boundary ?? "Redraw boundary") : (t.btn_draw_boundary ?? "Draw boundary")}
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
                <button type="button" onClick={handleClearSearch} className="shrink-0 text-muted-foreground hover:text-foreground">
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
                searchResults.map((result, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSearchResult(result)}
                    className="block w-full truncate border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted"
                    title={result.displayName}
                  >
                    {result.displayName}
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-center text-muted-foreground text-xs">{t.search_no_results ?? "No places found."}</div>
              )}
            </div>
          )}
        </div>

        {vertices.length > 0 && (
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
          title={isFullscreen ? (t.map_exit_fullscreen_tooltip ?? "Exit fullscreen") : (t.map_expand_tooltip ?? "Expand map")}
          className={`absolute right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background ${
            vertices.length > 0 ? "top-12" : "top-2"
          }`}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setBaseLayer((prev) => (prev === "street" ? "satellite" : "street"))}
          title={baseLayer === "street" ? (t.map_satellite_tooltip ?? "Switch to satellite view") : (t.map_street_tooltip ?? "Switch to street view")}
          className={`absolute right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background ${
            vertices.length > 0 ? "top-[5.5rem]" : "top-12"
          }`}
        >
          <Satellite className="h-4 w-4" />
        </button>

        {showZones && zones && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex flex-col gap-1 rounded-md border bg-background/90 px-2 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
            {Object.entries(ZONE_COLORS).map(([code, color]) => (
              <div key={code} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                <span className="capitalize text-muted-foreground">{code.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}

        {isDrawing && vertices.length === 0 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-lg border bg-background/90 px-3 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {t.boundary_click_prompt ?? "Click on the map to start marking your boundary"}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      {isDrawing && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUndoLastPoint}
              disabled={vertices.length === 0 || saving}
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t.btn_undo_point ?? "Undo point"}
            </button>
            <button
              type="button"
              onClick={handleClearDrawing}
              disabled={saving}
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t.btn_cancel ?? "Cancel"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canFinish || saving}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {vertices.length < 3
              ? (t.btn_add_more_points ?? "Add {n} more point(s)").replace("{n}", String(3 - vertices.length))
              : (t.btn_save_boundary ?? "Save boundary")}
          </button>
        </div>
      )}

      {!isDrawing && savedArea && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              {t.label_area ?? "Area"}: <span className="font-medium text-foreground">{savedArea.properties.area_hectares} {t.label_hectares ?? "hectares"}</span>
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              {t.btn_delete ?? "Delete"}
            </button>
          </div>

          {savedArea.properties.zone_name_en && (
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {t.label_region ?? "Region"}: <span className="font-medium text-foreground">{savedArea.properties.zone_name_en}</span>
              </span>
            </div>
          )}

          {savedArea.properties.soil_type && (
            <div className="flex items-center gap-1.5 text-xs">
              <Sprout className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {t.label_soil ?? "Soil"}: <span className="font-medium text-foreground">{savedArea.properties.soil_type}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}