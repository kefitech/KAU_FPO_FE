"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, Loader2, MapPin, RotateCcw, Sprout, Trash2 } from "lucide-react";

import { BoundaryMap, type LatLng } from "@/components/gis/boundary-map";
import { WeatherCard } from "@/components/gis/weather-card";
import {
  deleteCultivationArea,
  getCultivationArea,
  getWeather,
  refreshWeather,
  saveCultivationArea,
} from "@/lib/api/gis";
import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";
import type { CultivationAreaFeature, SaveCultivationAreaRequest, WeatherSnapshot } from "@/types/gis";

export type { LatLng };

type T = Record<string, string>;

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

interface CultivationAreaMapProps {
  /** Reports whether a saved boundary exists, so the recommendation panel
   * (a sibling component) can require one before requesting a
   * recommendation. Called once the initial load resolves, and again on
   * every save/delete -- left uncalled if the initial load fails, so the
   * caller treats "unknown" as "don't block" rather than assuming absence. */
  onAreaChange?: (hasArea: boolean) => void;
}

export function CultivationAreaMap({ onAreaChange }: CultivationAreaMapProps = {}) {
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
        onAreaChange?.(!!area);
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

  function handleClearDrawing() {
    setIsDrawing(false);
    setVertices(savedArea ? featureToVertices(savedArea) : []);
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
      onAreaChange?.(true);
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
      onAreaChange?.(false);
      handleWeatherRefresh();
    } catch {
      setError(t.error_delete_area ?? "Could not delete your cultivation area. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canFinish = isDrawing && vertices.length >= 3;

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

      <BoundaryMap
        vertices={vertices}
        onVerticesChange={setVertices}
        isDrawing={isDrawing}
        onStartDrawing={handleStartDrawing}
        hasArea={!!savedArea}
        t={t}
      />

      {error && <p className="text-destructive text-xs">{error}</p>}

      {isDrawing && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
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
              {t.label_area ?? "Area"}:{" "}
              <span className="font-medium text-foreground">
                {savedArea.properties.area_hectares} {t.label_hectares ?? "hectares"}
              </span>
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
                {t.label_region ?? "Region"}:{" "}
                <span className="font-medium text-foreground">{savedArea.properties.zone_name_en}</span>
              </span>
            </div>
          )}

          {savedArea.properties.soil_type && (
            <div className="flex items-center gap-1.5 text-xs">
              <Sprout className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {t.label_soil ?? "Soil"}:{" "}
                <span className="font-medium text-foreground">{savedArea.properties.soil_type}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
