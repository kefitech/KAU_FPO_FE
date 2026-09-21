import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export type MasterCategory = "commodity" | "promoting_agency" | "bank_name" | "crop_name" | "crop_group";

/** The master data tables managed here: category code, admin API path and display label. */
export const MASTER_CATEGORIES: { value: MasterCategory; path: string; label: string }[] = [
  { value: "commodity", path: "commodities", label: "Commodities" },
  { value: "promoting_agency", path: "promoting-agencies", label: "Promoting Agencies" },
  { value: "bank_name", path: "banks", label: "Banks" },
  { value: "crop_name", path: "crop-names", label: "Crop Names" },
  { value: "crop_group", path: "crop-groups", label: "Crop Groups" },
];

export const COMMODITY_SECTIONS = [
  "agricultural",
  "horticultural_fruits",
  "horticultural_vegetables",
  "horticultural_tubers",
  "value_added",
] as const;

/** React Query key prefix for one category's table — used by the table and by mutations that refresh it. */
export const masterDataQueryKey = (category: MasterCategory) => `master-data-${category}`;

export interface MasterDataEntry {
  id: number;
  code: string;
  name_en: string;
  name_ml: string;
  description: string;
  display_order: number;
  is_active: boolean;
  metadata: { section?: string };
}

export interface MasterDataCreatePayload {
  code?: string;
  name_en: string;
  name_ml?: string;
  section?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export type MasterDataUpdatePayload = Partial<Omit<MasterDataCreatePayload, "code">>;

const base = (category: MasterCategory) => `/admin/${MASTER_CATEGORIES.find((c) => c.value === category)!.path}/`;

export const masterDataAdminApi = {
  getAll: (category: MasterCategory, params: DataTableParams) =>
    api.get<PaginatedResponse<MasterDataEntry>>(base(category), { params }).then((r) => r.data),

  create: (category: MasterCategory, payload: MasterDataCreatePayload) =>
    api.post<Wrapped<MasterDataEntry>>(base(category), payload).then(unwrap),

  update: (category: MasterCategory, id: number, payload: MasterDataUpdatePayload) =>
    api.patch<Wrapped<MasterDataEntry>>(`${base(category)}${id}/`, payload).then(unwrap),

  delete: (category: MasterCategory, id: number) => api.delete(`${base(category)}${id}/`),

  activate: (category: MasterCategory, id: number) =>
    api.post<Wrapped<MasterDataEntry>>(`${base(category)}${id}/activate/`).then(unwrap),

  deactivate: (category: MasterCategory, id: number) =>
    api.post<Wrapped<MasterDataEntry>>(`${base(category)}${id}/deactivate/`).then(unwrap),
};
