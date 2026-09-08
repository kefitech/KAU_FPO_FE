/**
 * Admin DPR projects client — read-only oversight of every FPO's DPR.
 *
 * Endpoint:
 *   GET /api/admin/dpr/projects/?status=&district=&search=&page=&page_size=
 *
 * Access: super_admin or sub_admin.
 *
 * Author: Athul Gopan (Kefi Tech Solutions)
 */

import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export type DPRProjectStatus = "draft" | "in_progress" | "submitted" | "generated";

export interface DPRProjectRow {
  uuid: string;
  title: string;
  status: DPRProjectStatus;
  created_at: string;
  updated_at: string;
  fpo: {
    id: number;
    name: string;
    district: string;
    tier: string | null;
  } | null;
}

// DataTable uses the standard `PaginatedResponse<T>` shape from
// `@/types/pagination`, which matches the backend `StandardPagination`
// wire format directly. No flattening needed — DataTable reads
// `.data[]` for rows + `.meta.pagination` for paging controls.

export interface DPRReadinessItem {
  code: string;
  field: string;
  message: string;
}

export interface DPRSectionReadiness {
  errors: DPRReadinessItem[];
  warnings: DPRReadinessItem[];
  is_complete: boolean;
}

export interface DPRProjectDetail {
  project: {
    uuid: string;
    title: string;
    status: DPRProjectStatus;
    created_at: string;
    updated_at: string;
  };
  fpo: {
    id: number;
    name: string;
    application_id: string | null;
    district: string;
    tier: string | null;
    legal_structure: string;
    office_email: string;
    office_phone: string;
    total_members: number;
  } | null;
  sections: Record<
    string,
    {
      data: Record<string, unknown> | null;
      readiness: DPRSectionReadiness | null;
    }
  >;
}

// Applicability preview types — Phase 6e admin visibility surface for
// KAU during UAT rule validation. Shape mirrors the backend
// AdminProjectApplicabilityView response.
export interface AdminApplicabilityPreview {
  engine_enabled: boolean;
  applicability: Record<string, "M" | "O" | "H">;
  visible_sections: string[];
  mandatory_sections: string[];
  selected_components: Array<{ id: number; code: string; label: string }>;
  /** section_key → list of rules that touched it, so admin sees WHY it's M/H. */
  triggering_rules: Record<
    string,
    Array<{
      component_code: string;
      component_label: string;
      applicability: "M" | "O" | "H";
      notes: string;
    }>
  >;
}

export const adminDprProjectsApi = {
  // DataTable-compatible signature: returns the raw StandardPagination shape
  // directly (data + meta.pagination) — DataTable consumes it as-is.
  getAll: async (params: DataTableParams): Promise<PaginatedResponse<DPRProjectRow>> => {
    const r = await api.get<PaginatedResponse<DPRProjectRow>>("/admin/dpr/projects/", { params });
    return r.data;
  },

  detail: async (uuid: string) => {
    const r = await api.get<{ status: string; data: DPRProjectDetail }>(`/admin/dpr/projects/${uuid}/`);
    return r.data.data;
  },

  /** Phase 6e — preview which sections the rule engine hides for this project. */
  applicability: async (uuid: string): Promise<AdminApplicabilityPreview> => {
    const r = await api.get<{ status: string; data: AdminApplicabilityPreview }>(
      `/admin/dpr/projects/${uuid}/applicability/`,
    );
    return r.data.data;
  },
};

export const DPR_STATUS_LABELS: Record<DPRProjectStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  submitted: "Submitted",
  generated: "PDF Generated",
};

export const DPR_STATUS_COLORS: Record<DPRProjectStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  generated: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};
