/**
 * GIS Integration Types
 * Based on SRS Section 3.2.9
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type MapLayerType =
  | "district_boundaries"
  | "agro_climatic_zones"
  | "market_proximity"
  | "fpo_locations"
  | "crop_suitability"
  | "soil_type"
  | "water_availability";

export interface MapLayer {
  id: string;
  name: string;
  nameMl?: string;
  type: MapLayerType;
  visible: boolean;
  opacity: number;
  source: string; // WMS URL or GeoJSON
  sourceType: "wms" | "geojson" | "tile";
}

export interface FpoLocation {
  fpoId: string;
  fpoName: string;
  coordinates: Coordinates;
  district: string;
  address?: string;
  memberCount?: number;
  cultivationArea?: number; // in hectares
  primaryCrops?: string[];
}

// ── Cultivation Area — matches the REAL backend response from
// GET/POST /api/gis/cultivation-area/me/
// (apps/gis_module/api/cultivation_area.py). One area per FPO — the
// endpoint has no fpoId in the URL, it always operates on the logged-in
// user's own FPO. zone_code/zone_name/soil_type are derived server-side
// from the FPO's detected agro-climatic zone. ──

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeoJSONMultiPolygon {
  type: "MultiPolygon";
  coordinates: number[][][][]; // [ polygon [ ring [ [lng, lat], ... ] ] ]
}

/** What the backend returns for GET/POST /api/gis/cultivation-area/me/ */
export interface CultivationAreaFeature {
  id: number;
  type: "Feature";
  geometry: GeoJSONMultiPolygon;
  properties: {
    // DRF serializes DecimalField as a string, e.g. "36.40"
    area_hectares: string | null;
    // null if the FPO's zone hasn't been detected yet (e.g. no
    // latitude/longitude set, so the zone-detection signal never ran)
    zone_code: string | null;
    zone_name_en: string | null;
    zone_name_ml: string | null;
    soil_type: string | null;
  };
}

/**
 * What to send when saving. The backend accepts either a Polygon or a
 * MultiPolygon (it normalizes a single Polygon into a MultiPolygon
 * server-side) — a real map-drawing tool naturally produces a Polygon
 * for one farm boundary, so this is the more convenient shape to send.
 */
export interface SaveCultivationAreaRequest {
  type: "Feature";
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
  properties?: Record<string, never>; // backend ignores/overwrites properties on write
}

// ── Weather — matches GET/POST /api/gis/weather/me/(refresh/)
// (apps/gis_module/api/weather.py).
//
// TEMPORARY: is_simulated is currently always true — values come from
// a seasonal mock (Kerala's monsoon calendar), not a real weather
// service. Show this to the user (e.g. "estimated" badge) rather than
// presenting it as a live forecast. Will flip to false once a real
// provider (IMD Agromet API) is wired in on the backend — no frontend
// change needed then beyond removing/adjusting the badge. ──

export interface WeatherSnapshot {
  temperature_c: string | null;
  humidity_percent: string | null;
  rainfall_mm: string | null;
  season: "southwest_monsoon" | "northeast_monsoon" | "dry_season" | string;
  description: string;
  is_simulated: boolean;
  fetched_at: string;
}

export interface AgroClimaticZone {
  id: string;
  name: string;
  nameMl?: string;
  code: string;
  districts: string[];
  characteristics: {
    rainfall: string;
    temperature: string;
    soil: string;
    humidity: string;
  };
  suitableCrops: string[];
  geometry: GeoJSONPolygon;
}

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface MarketProximity {
  marketId: string;
  marketName: string;
  marketType: "apmc" | "wholesale" | "retail" | "cold_storage" | "processing_unit";
  coordinates: Coordinates;
  district: string;
  distanceFromFpo?: number; // km
}

export interface CropSuitabilityResult {
  crop: string;
  cropMl?: string;
  suitabilityScore: number; // 0-100
  suitabilityLevel: "high" | "medium" | "low" | "not_suitable";
  factors: {
    soil: number;
    water: number;
    climate: number;
    market: number;
  };
  recommendations: string[];
  recommendationsMl?: string[];
}

export interface LocationValidationRequest {
  coordinates: Coordinates;
  crop?: string;
  purpose: "registration" | "crop_suitability" | "market_linkage";
}

export interface LocationValidationResponse {
  isValid: boolean;
  district: string;
  agroClimaticZone?: string;
  soilType?: string;
  nearestMarkets: MarketProximity[];
  cropSuitability?: CropSuitabilityResult[];
  warnings?: string[];
}

// Map configuration
export interface MapConfig {
  center: Coordinates;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  bounds?: BoundingBox;
  baseLayers: MapLayer[];
  overlayLayers: MapLayer[];
}

// Kerala-specific defaults
export const KERALA_MAP_CONFIG: MapConfig = {
  center: { lat: 10.5276, lng: 76.2144 }, // Thrissur
  zoom: 8,
  minZoom: 6,
  maxZoom: 18,
  bounds: {
    north: 12.8,
    south: 8.2,
    east: 77.5,
    west: 74.8,
  },
  baseLayers: [],
  overlayLayers: [],
};

 
export interface ZoneFeature {
  id: number;
  type: "Feature";
  geometry: GeoJSONMultiPolygon;
  properties: {
    code: string;
    name_en: string;
    name_ml: string;
    suitable_crops: string[];
    soil_type: string;
  };
}
 
export interface ZoneFeatureCollection {
  type: "FeatureCollection";
  features: ZoneFeature[];
}