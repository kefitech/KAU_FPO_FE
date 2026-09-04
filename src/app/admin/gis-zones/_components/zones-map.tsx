"use client";

import { useState } from "react";

import { GeoJSON, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { Layers, Satellite } from "lucide-react";

import type { ZoneFeatureCollection } from "@/app/admin/_api/gis-zones";
import { ZONE_COLORS, bindZoneTooltip, makeZoneStyle } from "@/lib/gis/zone-colors";

type T = Record<string, string>;

const KERALA_CENTER: [number, number] = [10.5276, 76.2144];

interface Props {
  zones: ZoneFeatureCollection;
  mapKey: string;
  t: T;
}

export function ZonesMap({ zones, mapKey, t }: Props) {
  const [showZones, setShowZones] = useState(true);
  const [zoneOpacity, setZoneOpacity] = useState(0.38);
  const [baseLayer, setBaseLayer] = useState<"street" | "satellite">("street");

  const zoneStyle = makeZoneStyle(zoneOpacity);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative isolate h-96 overflow-hidden rounded-lg border">
        <MapContainer
          center={KERALA_CENTER}
          zoom={8}
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

          {showZones && (
            <GeoJSON
              key={`${zoneOpacity}-${mapKey}`}
              data={zones as unknown as GeoJSON.GeoJsonObject}
              style={zoneStyle}
              onEachFeature={bindZoneTooltip}
            />
          )}
        </MapContainer>

        <div className="absolute top-2 left-2 z-[400] flex flex-col gap-1.5 rounded-md border bg-background/90 p-2 shadow-md backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setShowZones((prev) => !prev)}
            className="flex items-center gap-1.5 font-medium text-xs hover:text-primary"
          >
            <Layers className="h-3.5 w-3.5" />
            {showZones ? (t.map_hide_zones ?? "Hide zones") : (t.map_show_zones ?? "Show zones")}
          </button>
          {showZones && (
            <div className="flex items-center gap-1.5">
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
        </div>

        <button
          type="button"
          onClick={() => setBaseLayer((prev) => (prev === "street" ? "satellite" : "street"))}
          title={baseLayer === "street" ? (t.map_satellite_tooltip ?? "Switch to satellite view") : (t.map_street_tooltip ?? "Switch to street view")}
          className="absolute top-2 right-2 z-[400] flex h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-foreground shadow-md backdrop-blur-sm hover:bg-background"
        >
          <Satellite className="h-4 w-4" />
        </button>

        {showZones && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex flex-col gap-1 rounded-md border bg-background/90 px-2 py-1.5 text-[10px] shadow-sm backdrop-blur-sm">
            {Object.entries(ZONE_COLORS).map(([code, color]) => (
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