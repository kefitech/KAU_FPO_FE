"use client";

import { CloudSun, Droplets, Loader2, RefreshCw, Thermometer } from "lucide-react";

type T = Record<string, string>;

/** The fields both the FPO weather snapshot and the admin test-location lookup return. */
export interface WeatherCardData {
  temperature_c: string | number | null;
  humidity_percent: string | number | null;
  rainfall_mm: string | number | null;
  season: string;
  description: string;
  is_simulated: boolean;
}

interface WeatherCardProps {
  weather: WeatherCardData | null;
  loading: boolean;
  refreshing?: boolean;
  error?: string | null;
  /** Omit to hide the Refresh / Check now actions. */
  onRefresh?: () => void;
  /** Shown instead of the default "No weather data yet." when there's nothing to show. */
  emptyText?: string;
  t: T;
}

/** "Weather & Season" card shown above the GIS map (FPO cultivation area, admin model test). */
export function WeatherCard({
  weather,
  loading,
  refreshing = false,
  error,
  onRefresh,
  emptyText,
  t,
}: WeatherCardProps) {
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
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-primary text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {t.weather_refresh ?? "Refresh"}
          </button>
        )}
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
          {emptyText ?? t.weather_no_data ?? "No weather data yet."}{" "}
          {onRefresh && (
            <button type="button" onClick={onRefresh} className="text-primary hover:underline">
              {t.weather_check_now ?? "Check now"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
