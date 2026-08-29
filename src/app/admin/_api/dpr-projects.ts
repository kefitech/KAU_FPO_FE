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

interface PaginatedResponse<T> {
  status: string;
  data: {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  };
}

export interface DPRProjectListFilters {
  status?: DPRProjectStatus | "";
  district?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

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

export const adminDprProjectsApi = {
  list: async (filters: DPRProjectListFilters = {}) => {
    const params: Record<string, string | number> = {};
    if (filters.status) params.status = filters.status;
    if (filters.district) params.district = filters.district;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.page_size) params.page_size = filters.page_size;

    const r = await api.get<PaginatedResponse<DPRProjectRow>>("/admin/dpr/projects/", { params });
    return r.data.data;
  },

  detail: async (uuid: string) => {
    const r = await api.get<{ status: string; data: DPRProjectDetail }>(`/admin/dpr/projects/${uuid}/`);
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
