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

export interface CultivationArea {
  id: string;
  fpoId: string;
  type: "polygon" | "point";
  coordinates: Coordinates[] | Coordinates;
  areaInHectares?: number;
  cropType?: string;
  soilType?: string;
  irrigationType?: string;
  createdAt: string;
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

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
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
