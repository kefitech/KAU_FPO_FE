"use client";

import { useEffect, useRef, useState } from "react";

import L from "leaflet";
import { Route, Satellite, Type } from "lucide-react";
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/gis/leaflet-overrides.css";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

import { MapToggleButton } from "./map-toggle-button";

type T = Record<string, string>;

const KERALA_CENTER: [number, number] = [10.5276, 76.2144];

// A small farm would otherwise be fitted to zoom 18-19, where the tiles show only streets and buildings
// (no village/town names) and, with zooming disabled here, the viewer cannot tell where it is. Capping
// the fit keeps place names visible; larger areas still fit as before because they need a lower zoom anyway.
const MAX_FIT_ZOOM = 16;

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="24" height="30" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#16a34a" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`,
  iconSize: [24, 30],
  iconAnchor: [12, 30],
});

interface Props {
  lat: number | null;
  lng: number | null;
  areaPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

function FitToData({ lat, lng, areaPolygon }: Props) {
  const map = useMap();
  useEffect(() => {
    // This map mounts inside a next/dynamic(ssr:false) component nested in a
    // conditionally-rendered wrapper, so Leaflet can end up reading the
    // container's size before layout has settled -- invalidateSize() forces
    // it to re-measure before we fit/pan, otherwise fitBounds/setView can
    // compute pixel coordinates against a stale (often zero) size and the
    // polygon/marker ends up positioned off-screen even though tiles (which
    // get corrected on their own tile-load cycle) still look fine.
    map.invalidateSize();
    if (areaPolygon) {
      const bounds = L.geoJSON(areaPolygon as unknown as GeoJSON.GeoJsonObject).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: MAX_FIT_ZOOM });
        return;
      }
    }
    if (lat != null && lng != null) {
      map.setView([lat, lng], 13);
    }
  }, [map, lat, lng, areaPolygon]);
  return null;
}

/**
 * Small, read-only reference map — NOT the cultivation-area editor. Just
 * shows where a saved recommendation's input_snapshot.location_snapshot
 * was, so a "stale" (still-displayed, but not from the latest request)
 * recommendation stays visually traceable to a real farm shape instead of
 * only an abstract zone code.
 */
export function RecommendationLocationMap({ lat, lng, areaPolygon }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite">("street");
  const [showRoads, setShowRoads] = useState(true);
  const [showPlaceNames, setShowPlaceNames] = useState(true);
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<T>({});

  useEffect(() => {
    translationsApi
      .getPublic(locale, "fpo_gis")
      .then((data) => setT(data.fpo_gis ?? {}))
      .catch(() => undefined);
  }, [locale]);

  return (
    <div className="relative isolate h-40 w-full overflow-hidden rounded-lg border">
      <MapContainer
        center={lat != null && lng != null ? [lat, lng] : KERALA_CENTER}
        zoom={areaPolygon ? 13 : lat != null ? 13 : 8}
        className="h-full w-full"
        style={{ zIndex: 0 }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        ref={(map) => {
          mapRef.current = map;
        }}
      >
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
        <FitToData lat={lat} lng={lng} areaPolygon={areaPolygon} />
        {areaPolygon ? (
          // react-leaflet's GeoJSON only reacts to `style` changes on an
          // already-mounted layer (it builds the actual L.geoJSON once from
          // the initial `data` and never calls addData() again) -- keying on
          // the polygon's own content forces a clean remount with the new
          // shape whenever the underlying recommendation changes, instead of
          // silently keeping (or losing) whatever was drawn on first mount.
          <GeoJSON
            key={JSON.stringify(areaPolygon)}
            data={areaPolygon as unknown as GeoJSON.GeoJsonObject}
            style={{ color: "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.25 }}
          />
        ) : (
          lat != null && lng != null && <Marker position={[lat, lng]} icon={pinIcon} />
        )}
      </MapContainer>

      <button
        type="button"
        onClick={() => setBaseLayer((prev) => (prev === "street" ? "satellite" : "street"))}
        title={
          baseLayer === "street"
            ? (t.map_satellite_tooltip ?? "Switch to satellite view")
            : (t.map_street_tooltip ?? "Switch to street view")
        }
        aria-label={
          baseLayer === "street"
            ? (t.map_satellite_tooltip ?? "Switch to satellite view")
            : (t.map_street_tooltip ?? "Switch to street view")
        }
        className="absolute top-2 right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
      >
        <Satellite className="h-4 w-4" />
      </button>

      {baseLayer === "satellite" && (
        <>
          <MapToggleButton
            active={showRoads}
            onClick={() => setShowRoads((v) => !v)}
            title={showRoads ? (t.map_roads_hide ?? "Hide roads") : (t.map_roads_show ?? "Show roads")}
            className={"top-12"}
          >
            <Route className="h-4 w-4" />
          </MapToggleButton>
          <MapToggleButton
            active={showPlaceNames}
            onClick={() => setShowPlaceNames((v) => !v)}
            title={
              showPlaceNames ? (t.map_labels_hide ?? "Hide place names") : (t.map_labels_show ?? "Show place names")
            }
            className={"top-[5.5rem]"}
          >
            <Type className="h-4 w-4" />
          </MapToggleButton>
        </>
      )}

      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1 text-[10px] shadow-sm backdrop-blur-sm">
        {areaPolygon ? (
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-[#16a34a] bg-[#16a34a]/30" />
        ) : (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white bg-[#16a34a]" />
        )}
        <span className="text-muted-foreground">
          {areaPolygon
            ? (t.preview_legend_boundary ?? "Farm boundary")
            : (t.preview_legend_location ?? "Farm location")}
        </span>
      </div>
    </div>
  );
}
