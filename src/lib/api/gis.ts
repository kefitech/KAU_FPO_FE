import type { ApiResponse } from "@/types/api";
import type {
  AgroClimaticZone,
  Coordinates,
  CropSuitabilityResult,
  CultivationArea,
  FpoLocation,
  LocationValidationRequest,
  LocationValidationResponse,
  MapConfig,
  MarketProximity,
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

/**
 * Get cultivation areas for an FPO
 */
export async function getCultivationAreas(fpoId: string): Promise<CultivationArea[]> {
  const response = await apiClient.get<ApiResponse<CultivationArea[]>>(`/v1/gis/cultivation-areas/${fpoId}`);
  return response.data.data;
}

/**
 * Save cultivation area (polygon drawing)
 */
export async function saveCultivationArea(
  fpoId: string,
  data: Omit<CultivationArea, "id" | "fpoId" | "createdAt">,
): Promise<CultivationArea> {
  const response = await apiClient.post<ApiResponse<CultivationArea>>(`/v1/gis/cultivation-areas/${fpoId}`, data);
  return response.data.data;
}

/**
 * Delete cultivation area
 */
export async function deleteCultivationArea(areaId: string): Promise<void> {
  await apiClient.delete(`/v1/gis/cultivation-areas/${areaId}`);
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
