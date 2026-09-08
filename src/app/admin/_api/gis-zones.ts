// ── Replace src/app/admin/_api/gis-zones.ts entirely ──

import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface ZoneVersion {
  id: number;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminZone {
  code: string;
  name_en: string;
  name_ml: string;
  soil_type: string;
  suitable_crops: string[];
  updated_at: string;
}

export interface ZoneFeature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: AdminZone;
}

export interface ZoneFeatureCollection {
  type: "FeatureCollection";
  features: ZoneFeature[];
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const VERSIONS_BASE = "/admin/gis/zone-versions/";

export const adminGisZonesApi = {
  /**
   * Currently LIVE zone boundaries (whichever version was last
   * activated) — used only for the map display, reuses the existing
   * public zones endpoint since that's the same data an admin needs
   * to see.
   */
  getLiveZones: async (): Promise<ZoneFeatureCollection> => {
    const response = await api.get<Wrapped<ZoneFeatureCollection>>("/gis/zones/");
    return response.data.data;
  },

  /** Paginated list of all uploaded (staged + activated) versions. */
  getVersions: (params: DataTableParams) =>
    api.get<PaginatedResponse<ZoneVersion>>(VERSIONS_BASE, { params }).then((r) => r.data),

  /**
   * Uploads + validates a new GeoJSON FeatureCollection, staged as an
   * INACTIVE version. Does NOT touch live zones — only activate() does.
   */
  upload: (formData: FormData): Promise<ZoneVersion> =>
    api
      .post<Wrapped<ZoneVersion>>(VERSIONS_BASE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),

  /** Full record for one version, including geojson_data — used for previewing on the map. */
  getVersionDetail: (id: number): Promise<{ id: number; label: string; is_active: boolean; geojson_data: ZoneFeatureCollection }> =>
    api.get<Wrapped<{ id: number; label: string; is_active: boolean; geojson_data: ZoneFeatureCollection }>>(`${VERSIONS_BASE}${id}/`).then(unwrap),

  /** Applies a staged version's geometry to the live zones. */
  activate: (id: number): Promise<{ updated_zones: string[] }> =>
    api.post<Wrapped<{ updated_zones: string[] }>>(`${VERSIONS_BASE}${id}/activate/`).then(unwrap),

  /**
   * Deletes a staged/inactive version. Backend blocks deleting
   * whichever version is currently active.
   */
  delete: (id: number): Promise<void> =>
    api.delete(`${VERSIONS_BASE}${id}/`).then(() => undefined),
};