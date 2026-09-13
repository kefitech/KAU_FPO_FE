import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface SoilRegionVersion {
  id: number;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminSoilRegion {
  code: string;
  name_en: string;
  name_ml: string;
  soil_type: string;
}

export interface SoilRegionFeature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: AdminSoilRegion;
}

export interface SoilRegionFeatureCollection {
  type: "FeatureCollection";
  features: SoilRegionFeature[];
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const VERSIONS_BASE = "/admin/gis/soil-region-versions/";

export const adminSoilRegionsApi = {
  /**
   * Currently LIVE soil regions (whichever version was last activated) —
   * used only for the map display, reuses the public soil-regions
   * endpoint since that's the same data an admin needs to see.
   */
  getLiveSoilRegions: async (): Promise<SoilRegionFeatureCollection> => {
    const response = await api.get<Wrapped<SoilRegionFeatureCollection>>("/gis/soil-regions/");
    return response.data.data;
  },

  /** Paginated list of all uploaded (staged + activated) versions. */
  getVersions: (params: DataTableParams) =>
    api.get<PaginatedResponse<SoilRegionVersion>>(VERSIONS_BASE, { params }).then((r) => r.data),

  /**
   * Uploads + validates a new GeoJSON FeatureCollection, staged as an
   * INACTIVE version. Does NOT touch live soil regions — only activate() does.
   */
  upload: (formData: FormData): Promise<SoilRegionVersion> =>
    api
      .post<Wrapped<SoilRegionVersion>>(VERSIONS_BASE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),

  /** Full record for one version, including geojson_data — used for previewing on the map. */
  getVersionDetail: (
    id: number,
  ): Promise<{ id: number; label: string; is_active: boolean; geojson_data: SoilRegionFeatureCollection }> =>
    api
      .get<Wrapped<{ id: number; label: string; is_active: boolean; geojson_data: SoilRegionFeatureCollection }>>(
        `${VERSIONS_BASE}${id}/`,
      )
      .then(unwrap),

  /**
   * Applies a staged version to the live soil regions — a full sync
   * (upsert regions present in the upload, remove any not present),
   * unlike zones' partial per-code update.
   */
  activate: (id: number): Promise<{ upserted_regions: string[]; removed_regions: string[] }> =>
    api
      .post<Wrapped<{ upserted_regions: string[]; removed_regions: string[] }>>(`${VERSIONS_BASE}${id}/activate/`)
      .then(unwrap),

  /**
   * Deletes a staged/inactive version. Backend blocks deleting
   * whichever version is currently active.
   */
  delete: (id: number): Promise<void> => api.delete(`${VERSIONS_BASE}${id}/`).then(() => undefined),
};
