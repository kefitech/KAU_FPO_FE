import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface CropPopVariety {
  name: string;
  description?: string;
}

export interface CropPopSection {
  heading: string;
  body: string;
}

export interface CropPackageOfPractices {
  id: number;
  crop_name: string;
  crop_group: string;
  season: string;
  varieties: CropPopVariety[];
  spacing: string;
  manuring_fertilizer: string;
  plant_protection: string;
  harvesting: string;
  expected_yield: string;
  sections: CropPopSection[];
  source_reference: string;
  source_page_range: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CropPackageOfPracticesPayload {
  crop_name: string;
  crop_group?: string;
  season?: string;
  varieties?: CropPopVariety[];
  spacing?: string;
  manuring_fertilizer?: string;
  plant_protection?: string;
  harvesting?: string;
  expected_yield?: string;
  sections?: CropPopSection[];
  source_reference?: string;
  source_page_range?: string;
  is_active?: boolean;
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

const BASE = "/admin/crop-pop/";

export const adminCropPackageOfPracticesApi = {
  getAll: (params?: DataTableParams): Promise<PaginatedResponse<CropPackageOfPractices>> =>
    api.get<PaginatedResponse<CropPackageOfPractices>>(BASE, { params }).then((r) => r.data),

  getById: (id: number): Promise<CropPackageOfPractices> =>
    api.get<Wrapped<CropPackageOfPractices>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: CropPackageOfPracticesPayload): Promise<CropPackageOfPractices> =>
    api.post<Wrapped<CropPackageOfPractices>>(BASE, payload).then(unwrap),

  update: (id: number, payload: Partial<CropPackageOfPracticesPayload>): Promise<CropPackageOfPractices> =>
    api.patch<Wrapped<CropPackageOfPractices>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number): Promise<void> => api.delete(`${BASE}${id}/`).then(() => undefined),

  activate: (id: number): Promise<CropPackageOfPractices> =>
    api.post<Wrapped<CropPackageOfPractices>>(`${BASE}${id}/activate/`).then(unwrap),

  deactivate: (id: number): Promise<CropPackageOfPractices> =>
    api.post<Wrapped<CropPackageOfPractices>>(`${BASE}${id}/deactivate/`).then(unwrap),
};
