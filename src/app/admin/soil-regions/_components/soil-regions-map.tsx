"use client";

import { useEffect, useRef, useState } from "react";

import L from "leaflet";
import { GeoJSON, MapContainer, Marker, ScaleControl, TileLayer, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/gis/leaflet-overrides.css";

import { Crosshair, Layers, Loader2, Maximize2, Minimize2, Satellite, Search, X } from "lucide-react";

import type { SoilRegionFeatureCollection } from "@/app/admin/_api/soil-regions";
import { bindSoilRegionTooltip, getSoilRegionColor, makeSoilRegionStyle } from "@/lib/gis/soil-region-colors";

type T = Record<string, string>;

interface SearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

const KERALA_CENTER: [number, number] = [10.5276, 76.2144];

const searchPinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#2563eb" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function MapInstanceCapture({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

interface Props {
  regions: SoilRegionFeatureCollection;
  mapKey: string;
  t: T;
}

export function SoilRegionsMap({ regions, mapKey, t }: Props) {
  const [showRegions, setShowRegions] = useState(true);
  const [regionOpacity, setRegionOpacity] = useState(0.38);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite">("street");

  const regionStyle = makeSoilRegionStyle(regionOpacity);

  const legendEntries = (regions.features ?? []).map((f) => ({
    code: f.properties.code,
    color: getSoilRegionColor(f.properties.code),
  }));

  const mapRef = useRef<L.Map | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  function handleRecenter() {
    const map = mapRef.current;
    if (!map) return;
    if (regions.features.length > 0) {
      const bounds = L.geoJSON(regions as unknown as GeoJSON.GeoJsonObject).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
        return;
      }
    }
    map.setView(KERALA_CENTER, 8);
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number } | null>(null);

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

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={mapWrapperRef}
        className={`relative isolate overflow-hidden rounded-lg border ${isFullscreen ? "h-screen" : "h-96"}`}
      >
        <MapContainer
          center={KERALA_CENTER}
          zoom={8}
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
              <TileLayer
                attribution="Labels &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                maxNativeZoom={18}
              />
            </>
          )}

          <MapInstanceCapture onReady={(map) => { mapRef.current = map; }} />

          {searchPin && <Marker position={[searchPin.lat, searchPin.lng]} icon={searchPinIcon} />}

          {showRegions && (
            <GeoJSON
              key={`${regionOpacity}-${mapKey}`}
              data={regions as unknown as GeoJSON.GeoJsonObject}
              style={regionStyle}
              onEachFeature={bindSoilRegionTooltip}
            />
          )}
        </MapContainer>

        <div className="absolute top-2 left-2 z-[400] flex flex-col gap-1.5 rounded-md border bg-background/90 p-2 shadow-md backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setShowRegions((prev) => !prev)}
            className="flex items-center gap-1.5 font-medium text-xs hover:text-primary"
          >
            <Layers className="h-3.5 w-3.5" />
            {showRegions ? (t.map_hide_regions ?? "Hide soil regions") : (t.map_show_regions ?? "Show soil regions")}
          </button>
          {showRegions && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t.map_opacity ?? "Opacity"}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={regionOpacity}
                onChange={(e) => setRegionOpacity(Number.parseFloat(e.target.value))}
                className="h-1 w-20 accent-primary"
              />
            </div>
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

        <button
          type="button"
          onClick={handleRecenter}
          title={t.map_recenter_tooltip ?? "Recenter on all soil regions"}
          className="absolute top-2 right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-md backdrop-blur-sm hover:bg-background"
        >
          <Crosshair className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          title={isFullscreen ? (t.map_exit_fullscreen_tooltip ?? "Exit fullscreen") : (t.map_expand_tooltip ?? "Expand map")}
          className="absolute top-12 right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-md backdrop-blur-sm hover:bg-background"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setBaseLayer((prev) => (prev === "street" ? "satellite" : "street"))}
          title={baseLayer === "street" ? (t.map_satellite_tooltip ?? "Switch to satellite view") : (t.map_street_tooltip ?? "Switch to street view")}
          className="absolute top-[5.5rem] right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-md backdrop-blur-sm hover:bg-background"
        >
          <Satellite className="h-4 w-4" />
        </button>

        {showRegions && legendEntries.length > 0 && (
          <div className="pointer-events-none absolute bottom-8 left-2 z-[400] flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border bg-background/90 px-2 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
            {legendEntries.map(({ code, color }) => (
              <div key={code} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                <span className="capitalize text-muted-foreground">{code.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
