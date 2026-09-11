"use client";

import { useEffect, useRef } from "react";

import L from "leaflet";
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/gis/leaflet-overrides.css";

const KERALA_CENTER: [number, number] = [10.5276, 76.2144];

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
    if (areaPolygon) {
      const bounds = L.geoJSON(areaPolygon as unknown as GeoJSON.GeoJsonObject).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
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

  return (
    <div className="h-40 w-full overflow-hidden rounded-lg border">
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitToData lat={lat} lng={lng} areaPolygon={areaPolygon} />
        {areaPolygon ? (
          <GeoJSON
            data={areaPolygon as unknown as GeoJSON.GeoJsonObject}
            style={{ color: "#16a34a", weight: 2, fillColor: "#16a34a", fillOpacity: 0.25 }}
          />
        ) : (
          lat != null && lng != null && <Marker position={[lat, lng]} icon={pinIcon} />
        )}
      </MapContainer>
    </div>
  );
}
