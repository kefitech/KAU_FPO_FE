"use client";

import { useEffect, useRef, useState } from "react";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#16a34a"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
    <circle cx="14" cy="14" r="3" fill="#16a34a"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
});

export interface LatLng {
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

// Flies to coords whenever coords reference changes — watches internal flyCoords, not the pin value
function FlyToLocation({ coords }: { coords: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

interface MapPinPickerProps {
  value: LatLng | null;
  onChange: (coords: LatLng | null) => void;
  onGpsLocation?: (coords: LatLng) => void;
  /** Fly the map to these coords without dropping a pin (e.g. from pincode lookup) */
  flyTo?: LatLng | null;
}

const KERALA_CENTER: [number, number] = [10.5276, 76.2144];

export function MapPinPicker({ value, onChange, onGpsLocation, flyTo }: MapPinPickerProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Internal fly target — decoupled from the pin (value). GPS and pincode both update this.
  const [flyCoords, setFlyCoords] = useState<LatLng | null>(null);

  // Sync external flyTo prop → internal flyCoords (for pincode-triggered fly)
  useEffect(() => {
    if (flyTo) setFlyCoords({ ...flyTo });
  }, [flyTo]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim() || q.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}+Kerala&format=json&limit=6&countrycodes=in`,
          { headers: { "Accept-Language": "en" } },
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch {
        // silently skip
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }

  function handleSelectResult(result: NominatimResult) {
    const coords: LatLng = {
      lat: Number(Number(result.lat).toFixed(6)),
      lng: Number(Number(result.lon).toFixed(6)),
    };
    // Search result → drop pin AND fly
    onChange(coords);
    setFlyCoords({ ...coords });
    setSearchQuery(result.display_name.split(",")[0].trim());
    setShowResults(false);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: LatLng = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        // Fly to location WITHOUT dropping a pin — user places pin manually
        setFlyCoords({ ...coords });
        onGpsLocation?.(coords);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Location permission denied. Please allow access and try again.");
        } else {
          setGpsError("Unable to fetch location. Try clicking on the map instead.");
        }
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Location search */}
      <div className="relative" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search location (e.g. Irinjalakuda, Thrissur)…"
            className="w-full rounded-md border bg-background py-2 pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchLoading && (
            <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {!searchLoading && searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md">
            {searchResults.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2 text-foreground">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS button + hint */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">Click map to pin · drag to adjust · or use GPS</p>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={gpsLoading}
          className="flex items-center gap-1.5 font-medium text-primary text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {gpsLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Locating…
            </>
          ) : (
            <>
              <LocateFixed className="h-3.5 w-3.5" /> Use My Location
            </>
          )}
        </button>
      </div>

      <div className="relative h-72 overflow-hidden rounded-lg border">
        <MapContainer
          center={value ? [value.lat, value.lng] : KERALA_CENTER}
          zoom={value ? 14 : 9}
          className="h-full w-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={(lat, lng) => onChange({ lat, lng })} />
          <FlyToLocation coords={flyCoords} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const pos = (e.target as L.Marker).getLatLng();
                  onChange({
                    lat: Number(pos.lat.toFixed(6)),
                    lng: Number(pos.lng.toFixed(6)),
                  });
                },
              }}
            />
          )}
        </MapContainer>

        {!value && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-lg border bg-background/90 px-3 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Click on the map to pin your FPO location
            </div>
          </div>
        )}
      </div>

      {gpsError && <p className="text-destructive text-xs">{gpsError}</p>}

      {value ? (
        <div className="flex items-center justify-between">
          <p className="font-mono text-muted-foreground text-xs">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-destructive"
          >
            <X className="h-3 w-3" />
            Clear pin
          </button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">Optional — you can add this later</p>
      )}
    </div>
  );
}
