import type { ApiResponse } from "@/types/api";
import type {
  AgroClimaticZone,
  Coordinates,
  CropSuitabilityResult,
  CultivationAreaFeature,
  SaveCultivationAreaRequest,
  FpoLocation,
  LocationValidationRequest,
  LocationValidationResponse,
  MapConfig,
  MarketProximity,
  WeatherSnapshot,
} from "@/types/gis";

import { apiClient } from "./client";

/**
 * Get map configuration
 */
export async function getMapConfig(): Promise<MapConfig> {
  const response = await apiClient.get<ApiResponse<MapConfig>>("/v1/gis/config");
  return response.data.data;
}

/**
 * Get all FPO locations for map display
 */
export async function getFpoLocations(district?: string): Promise<FpoLocation[]> {
  const params = district ? `?district=${district}` : "";
  const response = await apiClient.get<ApiResponse<FpoLocation[]>>(`/v1/gis/fpo-locations${params}`);
  return response.data.data;
}

/**
 * Get single FPO location
 */
export async function getFpoLocation(fpoId: string): Promise<FpoLocation> {
  const response = await apiClient.get<ApiResponse<FpoLocation>>(`/v1/gis/fpo-locations/${fpoId}`);
  return response.data.data;
}

/**
 * Save FPO location (during registration or profile update)
 */
export async function saveFpoLocation(
  fpoId: string,
  data: { coordinates: Coordinates; address?: string },
): Promise<FpoLocation> {
  const response = await apiClient.post<ApiResponse<FpoLocation>>(`/v1/gis/fpo-locations/${fpoId}`, data);
  return response.data.data;
}

// ── Cultivation Area — matches the REAL, tested backend endpoint:
// GET/POST/DELETE /api/gis/cultivation-area/me/
// (apps/gis_module/api/cultivation_area.py). One area per FPO, no
// fpoId in the URL — the backend always resolves "which FPO" from the
// logged-in user's own session. ──

const CULTIVATION_AREA_PATH = "/gis/cultivation-area/me/";

/**
 * Fetch the current FPO's own cultivation area.
 * Returns null if none has been drawn/saved yet (backend returns 404
 * in that case — this is expected, not an error state to surface).
 */
export async function getCultivationArea(): Promise<CultivationAreaFeature | null> {
  try {
    const response = await apiClient.get<ApiResponse<CultivationAreaFeature>>(CULTIVATION_AREA_PATH);
    return response.data.data;
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 404) return null;
    throw error;
  }
}

/**
 * Save (create or replace) the current FPO's cultivation area.
 * A fresh call always overwrites any existing area — there is only
 * ever one per FPO, so this is effectively an upsert.
 */
export async function saveCultivationArea(
  feature: SaveCultivationAreaRequest,
): Promise<CultivationAreaFeature> {
  const response = await apiClient.post<ApiResponse<CultivationAreaFeature>>(CULTIVATION_AREA_PATH, feature);
  return response.data.data;
}

/**
 * Delete the current FPO's cultivation area.
 */
export async function deleteCultivationArea(): Promise<void> {
  await apiClient.delete(CULTIVATION_AREA_PATH);
}

// ── Weather — matches GET/POST /api/gis/weather/me/(refresh/)
// (apps/gis_module/api/weather.py). TEMPORARY: backend currently
// returns a simulated seasonal estimate, not live weather — see
// WeatherSnapshot's doc comment in types/gis.ts. ──

const WEATHER_PATH = "/gis/weather/me/";
const WEATHER_REFRESH_PATH = "/gis/weather/me/refresh/";

/**
 * Fetch the current FPO's cached weather snapshot.
 * Returns null if none has been fetched yet — call refreshWeather()
 * first in that case.
 */
export async function getWeather(): Promise<WeatherSnapshot | null> {
  try {
    const response = await apiClient.get<ApiResponse<WeatherSnapshot>>(WEATHER_PATH);
    return response.data.data;
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 404) return null;
    throw error;
  }
}

/**
 * Fetch a fresh weather estimate and store it, replacing any cached
 * snapshot. Requires the FPO to have a location (cultivation area or
 * latitude/longitude) — backend returns 400 otherwise.
 */
export async function refreshWeather(): Promise<WeatherSnapshot> {
  const response = await apiClient.post<ApiResponse<WeatherSnapshot>>(WEATHER_REFRESH_PATH);
  return response.data.data;
}

/**
 * Get agro-climatic zones
 */
export async function getAgroClimaticZones(): Promise<AgroClimaticZone[]> {
  const response = await apiClient.get<ApiResponse<AgroClimaticZone[]>>("/v1/gis/agro-climatic-zones");
  return response.data.data;
}

/**
 * Get agro-climatic zone for a location
 */
export async function getAgroClimaticZoneForLocation(coordinates: Coordinates): Promise<AgroClimaticZone | null> {
  const response = await apiClient.get<ApiResponse<AgroClimaticZone | null>>(
    `/v1/gis/agro-climatic-zones/at?lat=${coordinates.lat}&lng=${coordinates.lng}`,
  );
  return response.data.data;
}

/**
 * Get nearby markets
 */
export async function getNearbyMarkets(
  coordinates: Coordinates,
  radius = 50, // km
): Promise<MarketProximity[]> {
  const response = await apiClient.get<ApiResponse<MarketProximity[]>>(
    `/v1/gis/markets/nearby?lat=${coordinates.lat}&lng=${coordinates.lng}&radius=${radius}`,
  );
  return response.data.data;
}

/**
 * Get crop suitability for a location
 */
export async function getCropSuitability(coordinates: Coordinates, crop?: string): Promise<CropSuitabilityResult[]> {
  const params = new URLSearchParams();
  params.append("lat", String(coordinates.lat));
  params.append("lng", String(coordinates.lng));
  if (crop) params.append("crop", crop);

  const response = await apiClient.get<ApiResponse<CropSuitabilityResult[]>>(
    `/v1/gis/crop-suitability?${params.toString()}`,
  );
  return response.data.data;
}

/**
 * Validate location (comprehensive check)
 */
export async function validateLocation(request: LocationValidationRequest): Promise<LocationValidationResponse> {
  const response = await apiClient.post<ApiResponse<LocationValidationResponse>>("/v1/gis/validate-location", request);
  return response.data.data;
}

/**
 * Get district boundaries GeoJSON
 */
export async function getDistrictBoundaries(): Promise<any> {
  const response = await apiClient.get<ApiResponse<any>>("/v1/gis/boundaries/districts");
  return response.data.data;
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(coordinates: Coordinates): Promise<{
  address: string;
  district: string;
  state: string;
}> {
  const response = await apiClient.get<ApiResponse<{ address: string; district: string; state: string }>>(
    `/v1/gis/reverse-geocode?lat=${coordinates.lat}&lng=${coordinates.lng}`,
  );
  return response.data.data;
}