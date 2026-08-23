"use client";

import { useEffect, useState } from "react";

import L from "leaflet";
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  CheckCircle2,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Sprout,
  Thermometer,
  Trash2,
  Undo2,
} from "lucide-react";

import { deleteCultivationArea, getCultivationArea, getWeather, refreshWeather, saveCultivationArea } from "@/lib/api/gis";
import type { CultivationAreaFeature, SaveCultivationAreaRequest, WeatherSnapshot } from "@/types/gis";

export interface LatLng {
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

const SEASON_LABELS: Record<string, string> = {
  southwest_monsoon: "South-West Monsoon",
  northeast_monsoon: "North-East Monsoon",
  dry_season: "Dry Season",
};

// ── GeoJSON <-> vertices conversion ──

function verticesToRequest(vertices: LatLng[]): SaveCultivationAreaRequest {
  const ring = vertices.map((v) => [v.lng, v.lat] as [number, number]);
  ring.push(ring[0]); // GeoJSON rings must close (first point repeated at the end)
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
    properties: {},
  };
}

function featureToVertices(feature: CultivationAreaFeature): LatLng[] {
  // Take the outer ring of the first polygon, drop the closing duplicate point
  const ring = feature.geometry.coordinates[0]?.[0] ?? [];
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

// ── Click-to-add-vertex handler (only active while drawing) ──

function DrawClickHandler({ active, onAddPoint }: { active: boolean; onAddPoint: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onAddPoint({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

// ── Weather card — now purely presentational, state lives in the parent
// so a new save/delete can trigger a refresh automatically ──

interface WeatherCardProps {
  weather: WeatherSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
}

function WeatherCard({ weather, loading, refreshing, error, onRefresh }: WeatherCardProps) {
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
          Weather &amp; Season
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-primary text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
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
              Estimated from seasonal patterns, not a live forecast.
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-xs">
          No weather data yet.{" "}
          <button type="button" onClick={onRefresh} className="text-primary hover:underline">
            Check now
          </button>
        </p>
      )}
    </div>
  );
}

export function CultivationAreaMap() {
  const [vertices, setVertices] = useState<LatLng[]>([]);
  const [savedArea, setSavedArea] = useState<CultivationAreaFeature | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Weather state lives here now, not inside WeatherCard — so it can be
  // refreshed automatically right after a boundary is saved or deleted,
  // not just on initial mount.
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  async function loadCachedWeather() {
    try {
      const result = await getWeather();
      setWeather(result);
    } catch {
      setWeatherError("Could not load weather.");
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
      setWeatherError("Could not fetch weather. Please try again.");
    } finally {
      setWeatherRefreshing(false);
    }
  }

  // Load existing cultivation area + cached weather on mount
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
        if (!cancelled) setError("Could not load your saved cultivation area.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    loadCachedWeather();
    return () => {
      cancelled = true;
    };
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
      // New boundary means a new location — refresh weather to match,
      // don't leave the old cached snapshot showing.
      handleWeatherRefresh();
    } catch {
      setError("Could not save your cultivation area. Please try again.");
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
      // Location fallback changes (back to the FPO's own lat/lng) —
      // refresh so weather doesn't keep showing the deleted plot's data.
      handleWeatherRefresh();
    } catch {
      setError("Could not delete your cultivation area. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canFinish = isDrawing && vertices.length >= 3;
  const mapCenter: [number, number] = vertices[0] ? [vertices[0].lat, vertices[0].lng] : KERALA_CENTER;

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/30">
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
      />

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {isDrawing
            ? "Click the map to place each corner of your farm boundary."
            : savedArea
              ? "This is your saved cultivation area."
              : "Draw your farm's boundary to help us give more accurate recommendations."}
        </p>
        {!isDrawing && (
          <button
            type="button"
            onClick={handleStartDrawing}
            className="flex items-center gap-1.5 font-medium text-primary text-xs hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" />
            {savedArea ? "Redraw boundary" : "Draw boundary"}
          </button>
        )}
      </div>

      <div className="relative h-72 overflow-hidden rounded-lg border">
        <MapContainer center={mapCenter} zoom={vertices[0] ? 15 : 9} className="h-full w-full" style={{ zIndex: 0 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DrawClickHandler active={isDrawing} onAddPoint={(p) => setVertices((prev) => [...prev, p])} />

          {vertices.length >= 3 && (
            <Polygon
              positions={vertices.map((v) => [v.lat, v.lng])}
              pathOptions={{ color: "#16a34a", fillOpacity: 0.2 }}
            />
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
                    handleVertexDrag(i, {
                      lat: Number(pos.lat.toFixed(6)),
                      lng: Number(pos.lng.toFixed(6)),
                    });
                  },
                }}
              />
            ))}
        </MapContainer>

        {isDrawing && vertices.length === 0 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-lg border bg-background/90 px-3 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Click on the map to start marking your boundary
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
              Undo point
            </button>
            <button
              type="button"
              onClick={handleClearDrawing}
              disabled={saving}
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canFinish || saving}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {vertices.length < 3 ? `Add ${3 - vertices.length} more point(s)` : "Save boundary"}
          </button>
        </div>
      )}

      {!isDrawing && savedArea && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Area: <span className="font-medium text-foreground">{savedArea.properties.area_hectares} hectares</span>
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Delete
            </button>
          </div>

          {savedArea.properties.zone_name_en && (
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Region: <span className="font-medium text-foreground">{savedArea.properties.zone_name_en}</span>
              </span>
            </div>
          )}

          {savedArea.properties.soil_type && (
            <div className="flex items-center gap-1.5 text-xs">
              <Sprout className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Soil: <span className="font-medium text-foreground">{savedArea.properties.soil_type}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}