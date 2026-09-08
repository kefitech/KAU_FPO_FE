/**
 * DPR Config admin API wrapper.
 *
 * Backend: apps/accounts/api/admin/dpr/config.py (created 2026-09-02 for KAU RCD B.6).
 *   GET   /api/admin/dpr/config/           → { categories: {<cat>: [row]}, count }
 *   GET   /api/admin/dpr/config/<id>/      → row
 *   PATCH /api/admin/dpr/config/<id>/      → { value } — super_admin only
 *   POST  /api/admin/dpr/config/<id>/reset/ → super_admin only
 */
import { api } from "@/lib/api/client";

export type DPRConfigCategory =
  | "financial"
  | "projection"
  | "variance"
  | "retention"
  | "risk"
  | "other";

export type DPRConfigValueType = "decimal" | "int" | "string" | "bool";

export interface DPRConfigRow {
  id: number;
  key: string;
  category: DPRConfigCategory;
  value_type: DPRConfigValueType;
  // Value is stored per its type but the API returns whatever was set —
  // decimal is a string, int/bool are their JS primitive, string is a string.
  value: string | number | boolean;
  default_value: string | number | boolean;
  label: string;
  description: string;
  unit: string;
  min_value: string | number | null;
  max_value: string | number | null;
  is_editable: boolean;
  updated_at: string;
  updated_by_email: string | null;
}

export interface DPRConfigListResponse {
  categories: Partial<Record<DPRConfigCategory, DPRConfigRow[]>>;
  count: number;
}

// StandardResponse wrapper — `{ data, message, status }` per backend convention.
interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

const BASE = "/admin/dpr/config/";

export const dprConfigApi = {
  list: () => api.get<Wrapped<DPRConfigListResponse>>(BASE).then((r) => r.data.data),
  retrieve: (id: number) => api.get<Wrapped<DPRConfigRow>>(`${BASE}${id}/`).then((r) => r.data.data),
  update: (id: number, value: string | number | boolean) =>
    api.patch<Wrapped<DPRConfigRow>>(`${BASE}${id}/`, { value }).then((r) => r.data.data),
  reset: (id: number) => api.post<Wrapped<DPRConfigRow>>(`${BASE}${id}/reset/`).then((r) => r.data.data),
};
