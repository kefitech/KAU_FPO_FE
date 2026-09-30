"use client";

import { useState } from "react";

import { AlertTriangle, CheckCircle2, Loader2, MapPin, RotateCcw, Sprout } from "lucide-react";

import type { ModelTestLocation, ModelTestLocationQuery } from "@/app/admin/_api/ml-models";
import { adminSoilRegionsApi } from "@/app/admin/_api/soil-regions";
import { BoundaryMap, type LatLng } from "@/components/gis/boundary-map";
import { WeatherCard } from "@/components/gis/weather-card";

const NO_LABELS: Record<string, string> = {};

interface TestLocationPanelProps {
  location: ModelTestLocation | null;
  loading: boolean;
  onLookup: (query: ModelTestLocationQuery) => void;
}

/**
 * Admin counterpart of the FPO cultivation-area map: same map, weather card
 * and boundary drawing, but the boundary (or a dropped pin) is only looked
 * up -- zone, soil, weather -- to fill the test form. Nothing is saved.
 */
export function TestLocationPanel({ location, loading, onLookup }: TestLocationPanelProps) {
  const [vertices, setVertices] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [areaSet, setAreaSet] = useState(false);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [lastQuery, setLastQuery] = useState<ModelTestLocationQuery | null>(null);

  function lookup(query: ModelTestLocationQuery) {
    setLastQuery(query);
    onLookup(query);
  }

  function handleStartDrawing() {
    setIsDrawing(true);
    setVertices([]);
    setPin(null);
  }

  function handleCancelDrawing() {
    setIsDrawing(false);
    if (!areaSet) setVertices([]);
  }

  function handleUseArea() {
    const ring = vertices.map((v) => [v.lng, v.lat]);
    ring.push(ring[0]);
    setIsDrawing(false);
    setAreaSet(true);
    lookup({ polygon: { type: "Polygon", coordinates: [ring] } });
  }

  function handleDropPin(p: LatLng) {
    setVertices([]);
    setAreaSet(false);
    setPin(p);
    lookup(p);
  }

  const canFinish = isDrawing && vertices.length >= 3;

  return (
    <div className="flex flex-col gap-2">
      <WeatherCard
        weather={location?.weather ?? null}
        loading={loading}
        onRefresh={lastQuery ? () => lookup(lastQuery) : undefined}
        emptyText="Draw a boundary or drop a pin to fetch the weather there."
        t={NO_LABELS}
      />

      <p className="text-muted-foreground text-xs">
        {isDrawing
          ? "Click the map to place each corner of the area."
          : "Draw a farm boundary (its centre is used, as for an FPO's cultivation area) or drop a pin. Zone, soil and weather are looked up and filled into the form below."}
      </p>

      <BoundaryMap
        vertices={vertices}
        onVerticesChange={setVertices}
        isDrawing={isDrawing}
        onStartDrawing={handleStartDrawing}
        hasArea={areaSet}
        pin={pin}
        onDropPin={handleDropPin}
        loadSoilRegions={adminSoilRegionsApi.getLiveSoilRegions}
        t={NO_LABELS}
      />

      {isDrawing && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCancelDrawing}
            className="flex items-center gap-1 text-muted-foreground text-xs hover:text-destructive"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUseArea}
            disabled={!canFinish}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {vertices.length < 3 ? `Add ${3 - vertices.length} more point(s)` : "Use this area"}
          </button>
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
          Looking up zone, soil and weather…
        </p>
      )}

      {!isDrawing && !loading && location && <LocationInfo location={location} />}
    </div>
  );
}

// Same layout as the FPO's saved-area panel (area, region, soil), plus the
// place name and which model soil category the GIS soil maps to.
function LocationInfo({ location: loc }: { location: ModelTestLocation }) {
  const soilNote = !loc.soil_region
    ? "No soil region here — the zone's soil mix will be averaged."
    : loc.soil_category
      ? `model category “${loc.soil_category}”`
      : loc.soil_category_checked
        ? "no matching model category — the zone's soil mix will be averaged, same as for an FPO"
        : "couldn't match to a model category (AI service unreachable)";

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">
        {loc.area_hectares !== null ? (
          <>
            Area: <span className="font-medium text-foreground">{loc.area_hectares} hectares</span> ·{" "}
          </>
        ) : null}
        {loc.address ?? "Unknown place"}{" "}
        <span className="text-muted-foreground/70">
          ({loc.lat}, {loc.lng})
        </span>
      </p>

      {loc.zone ? (
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            Region: <span className="font-medium text-foreground">{loc.zone.name}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-amber-700 text-xs dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Outside the supported zones — pick the zone in the form yourself.
        </div>
      )}

      <div className="flex items-start gap-1.5 text-xs">
        <Sprout className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>
          Soil: {loc.soil_region && <span className="font-medium text-foreground">{loc.soil_region.soil_type}</span>}
          {loc.soil_region ? " — " : ""}
          <span className="text-muted-foreground">{soilNote}</span>
        </span>
      </div>

      <p className="border-t pt-2 text-muted-foreground text-xs">
        Filled into the form: zone, soil type, current season, and today's temperature and humidity (replacing the
        zone's seasonal averages). Rainfall stays the seasonal average — the model uses monthly totals, which a current
        reading can't stand in for. FPOs' own recommendations always use the seasonal averages.
      </p>
    </div>
  );
}
