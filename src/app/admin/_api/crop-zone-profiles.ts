import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

// The KAU book's own physiographic zones -- must match
// apps.database.models.recommendations.CropZoneProfile.KauZone exactly.
export const KAU_ZONES = [
  "Coastal Plain",
  "Midland Laterites",
  "Foothills",
  "High Hills",
  "Palakkad Plain",
  "General (all zones)",
] as const;
export type KauZone = (typeof KAU_ZONES)[number];

export interface CropZoneProfile {
  id: number;
  crop_name: string;
  crop_group: string;
  kau_zone: KauZone;
  temp_lo: number;
  temp_hi: number;
  ph_lo: number;
  ph_hi: number;
  seasons_text: string;
  temp_is_real: boolean;
  ph_is_real: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CropZoneProfilePayload {
  crop_name: string;
  crop_group?: string;
  kau_zone: KauZone;
  temp_lo: number;
  temp_hi: number;
  ph_lo: number;
  ph_hi: number;
  seasons_text?: string;
  temp_is_real?: boolean;
  ph_is_real?: boolean;
  is_active?: boolean;
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const BASE = "/admin/crop-zone-profiles/";

export const adminCropZoneProfilesApi = {
  getAll: (params?: DataTableParams): Promise<PaginatedResponse<CropZoneProfile>> =>
    api.get<PaginatedResponse<CropZoneProfile>>(BASE, { params }).then((r) => r.data),

  getById: (id: number): Promise<CropZoneProfile> => api.get<Wrapped<CropZoneProfile>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: CropZoneProfilePayload): Promise<CropZoneProfile> =>
    api.post<Wrapped<CropZoneProfile>>(BASE, payload).then(unwrap),

  update: (id: number, payload: Partial<CropZoneProfilePayload>): Promise<CropZoneProfile> =>
    api.patch<Wrapped<CropZoneProfile>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number): Promise<void> => api.delete(`${BASE}${id}/`).then(() => undefined),

  activate: (id: number): Promise<CropZoneProfile> => api.post<Wrapped<CropZoneProfile>>(`${BASE}${id}/activate/`).then(unwrap),

  deactivate: (id: number): Promise<CropZoneProfile> =>
    api.post<Wrapped<CropZoneProfile>>(`${BASE}${id}/deactivate/`).then(unwrap),
};
