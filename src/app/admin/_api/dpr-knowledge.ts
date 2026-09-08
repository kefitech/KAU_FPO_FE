/**
 * DPR Knowledge Base — admin API wrapper.
 *
 * Backend: apps/accounts/api/admin/dpr/knowledge.py (created 2026-09-03 for
 * KAU RCD A.2 — AI narratives must trace back to authoritative sources).
 *
 * Endpoints (all under /api/admin/dpr/knowledge/):
 *   GET    /                     → list + filter + fulltext search
 *   POST   /                     → create entry (super_admin)
 *   GET    /<pk>/                → retrieve
 *   PATCH  /<pk>/                → update (super_admin)
 *   DELETE /<pk>/                → hard delete (super_admin) — rare
 *   POST   /<pk>/deactivate/     → soft-deactivate (super_admin)
 *   POST   /<pk>/supersede/      → create replacement entry, old auto-deactivates
 *
 * List response uses the standard `PaginatedResponse` envelope
 * (`{ data: [], meta: { pagination } }`) so it can be piped straight into
 * `<DataTable>` without transformation.
 */
import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

// Keep in sync with apps/database/models/dpr/knowledge.py::SourceType.
export type KnowledgeSourceType =
  | "kau_pop"
  | "scheme"
  | "sop"
  | "statutory"
  | "agmarknet"
  | "other";

export const SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
  kau_pop: "KAU Package of Practices",
  scheme: "Government scheme / subsidy",
  sop: "Kefi Tech SOP",
  statutory: "Kerala statutory / regulatory",
  agmarknet: "AGMARKNET market prices",
  other: "Other",
};

/** Short labels for narrow contexts (Select triggers, chips). */
export const SOURCE_TYPE_LABELS_SHORT: Record<KnowledgeSourceType, string> = {
  kau_pop: "KAU PoP",
  scheme: "Scheme",
  sop: "SOP",
  statutory: "Statutory",
  agmarknet: "AGMARKNET",
  other: "Other",
};

export const SOURCE_TYPE_ORDER: ReadonlyArray<KnowledgeSourceType> = [
  "kau_pop",
  "scheme",
  "sop",
  "statutory",
  "agmarknet",
  "other",
];

/** List row — compact shape, no full content. */
export interface KnowledgeEntryRow {
  id: number;
  source_type: KnowledgeSourceType;
  source_type_display: string;
  source_name: string;
  source_url: string;
  source_version: string;
  title: string;
  language: string;
  section_keys: string[];
  tags: string[];
  commodity_count: number;
  component_count: number;
  business_type_count: number;
  is_active: boolean;
  superseded_by: number | null;
  ingested_at: string;
  updated_at: string;
  updated_by_email: string | null;
}

interface LabelPair {
  id: number;
  name: string;
}

/** Detail — full read/write shape. */
export interface KnowledgeEntryDetail {
  id: number;
  source_type: KnowledgeSourceType;
  source_type_display: string;
  source_name: string;
  source_url: string;
  source_version: string;
  title: string;
  content: string;
  language: string;
  // Write side takes ID arrays; read side also returns *_labels for display.
  commodities: number[];
  commodity_labels: LabelPair[];
  components: number[];
  component_labels: LabelPair[];
  business_types: number[];
  business_type_labels: LabelPair[];
  section_keys: string[];
  tags: string[];
  is_active: boolean;
  superseded_by: number | null;
  ingested_at: string;
  created_at: string;
  updated_at: string;
  updated_by_email: string | null;
}

/** Create / update payload — accepts partial for PATCH. */
export interface KnowledgeEntryInput {
  source_type: KnowledgeSourceType;
  source_name: string;
  source_url?: string;
  source_version?: string;
  title: string;
  content: string;
  language?: string;
  commodities?: number[];
  components?: number[];
  business_types?: number[];
  section_keys?: string[];
  tags?: string[];
  is_active?: boolean;
}

export interface KnowledgeListFilters {
  page?: number;
  page_size?: number;
  source_type?: KnowledgeSourceType;
  language?: string;
  section?: string;
  commodity?: number;
  component?: number;
  tag?: string;
  is_active?: boolean;
  q?: string;
}

// Backend response envelope for single-item mutations
interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

const BASE = "/admin/dpr/knowledge/";

export const dprKnowledgeApi = {
  /**
   * DataTable-compatible signature. DataTable sends `search` for the free-
   * text field and any filter values keyed by the filter's `key`; backend
   * expects `q` for fulltext, so we map here rather than adding an alias
   * on the server.
   */
  getAll: async (
    params: DataTableParams,
  ): Promise<PaginatedResponse<KnowledgeEntryRow>> => {
    const query: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      if (k === "search") {
        query.q = v;
      } else {
        query[k] = v;
      }
    }
    const r = await api.get<PaginatedResponse<KnowledgeEntryRow>>(BASE, { params: query });
    return r.data;
  },

  /** Direct list — kept for non-DataTable callers (dashboards, etc.). */
  list: async (
    filters: KnowledgeListFilters = {},
  ): Promise<PaginatedResponse<KnowledgeEntryRow>> => {
    // Axios drops null/undefined params but not empty strings — strip them
    // so `?is_active=` doesn't accidentally coerce to false on the backend.
    const params: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") params[k] = v;
    }
    const r = await api.get<PaginatedResponse<KnowledgeEntryRow>>(BASE, { params });
    return r.data;
  },

  retrieve: (id: number) =>
    api.get<Wrapped<KnowledgeEntryDetail>>(`${BASE}${id}/`).then((r) => r.data.data),

  create: (payload: KnowledgeEntryInput) =>
    api.post<Wrapped<KnowledgeEntryDetail>>(BASE, payload).then((r) => r.data.data),

  update: (id: number, patch: Partial<KnowledgeEntryInput>) =>
    api
      .patch<Wrapped<KnowledgeEntryDetail>>(`${BASE}${id}/`, patch)
      .then((r) => r.data.data),

  remove: (id: number) => api.delete(`${BASE}${id}/`).then((r) => r.data),

  deactivate: (id: number) =>
    api
      .post<Wrapped<KnowledgeEntryDetail>>(`${BASE}${id}/deactivate/`)
      .then((r) => r.data.data),

  supersede: (id: number, payload: KnowledgeEntryInput) =>
    api
      .post<Wrapped<KnowledgeEntryDetail>>(`${BASE}${id}/supersede/`, payload)
      .then((r) => r.data.data),
};
