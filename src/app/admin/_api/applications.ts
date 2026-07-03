import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/pagination";

// ─── Tier Assessment (Admin) ──────────────────────────────────────────────────

export interface TierAuditLogChanges {
  tier: string;
  financial_year: string;
  total_score?: string;
  domain_scores?: Record<string, string>;
  manual_override?: boolean;
  notes?: string;
}

export interface TierAuditLogEntry {
  id: number;
  user_name?: string;
  created_at: string;
  changes: TierAuditLogChanges;
}

export interface AssignTierPayload {
  tier: string;
  financial_year: string;
  notes?: string;
}

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "info_required"
  | "suspended"
  | "claimed";

export interface ApplicationListItem {
  id: number;
  application_id: string;
  name: string;
  name_ml: string;
  district: string;
  district_display: string;
  status: ApplicationStatus;
  status_display: string;
  tier: string | null;
  current_tier: string | null;
  current_step: number;
  total_members: number | null;
  office_email: string;
  office_phone: string;
  email_verified: boolean;
  phone_verified: boolean;
  primary_user_id: number | null;
  primary_user_name: string | null;
  primary_user_email: string | null;
  primary_user_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDocument {
  id: number;
  document_type: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  is_verified: boolean;
  verified_at: string | null;
  verified_by_name: string | null;
  created_at: string;
}

export interface ApplicationStatusEntry {
  from_status: string;
  to_status: string;
  changed_by_name: string;
  notes: string;
  created_at: string;
}

export interface ApplicationPrimaryUser {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface ApplicationDetail {
  id: number;
  application_id: string;
  status: ApplicationStatus;
  tier: string;
  current_step: number;
  max_secondary_users: number;
  primary_user: ApplicationPrimaryUser | null;
  // Step 1
  name: string;
  name_ml: string;
  registration_number: string;
  cin_number: string;
  date_of_registration: string;
  legal_structure: string;
  legal_structure_detail: string;
  registered_under?: string; // legacy alias — use legal_structure
  pan_number: string;
  gst_number: string;
  promoting_agency: string | null;
  facilitating_agency_name: string | null;
  // Step 2
  district: string;
  district_display: string;
  block_taluk: string;
  village_town: string;
  address_line1: string;
  address_line2: string;
  pincode: string;
  office_phone: string;
  office_email: string;
  website: string;
  email_verified: boolean;
  phone_verified: boolean;
  latitude: string | null;
  longitude: string | null;
  // Step 3
  signatory_name: string;
  signatory_designation: string;
  signatory_phone: string;
  signatory_email: string;
  signatory_aadhaar_last4: string;
  total_members: number | null;
  male_members: number | null;
  female_members: number | null;
  sc_st_members: number | null;
  ceo_available: boolean;
  accountant_available: boolean;
  total_directors: number | null;
  women_directors: number | null;
  directors_under_35: number | null;
  // Step 4
  primary_commodities: string[];
  secondary_commodities: string[];
  annual_turnover: string | null;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  ifsc_code: string;
  description: string;
  // Relations
  documents: ApplicationDocument[];
  status_history: ApplicationStatusEntry[];
  created_at: string;
  updated_at: string;
}

export interface ApplicationListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  district?: string;
  tier?: string;
  ordering?: string;
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const adminApplicationsApi = {
  getAll: (params?: ApplicationListParams) =>
    api.get<PaginatedResponse<ApplicationListItem>>("/admin/applications/", { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<ApplicationDetail>>(`/admin/applications/${id}/`).then(unwrap),

  markUnderReview: (id: number) => api.post(`/admin/applications/${id}/mark-under-review/`),

  approve: (id: number) => api.post(`/admin/applications/${id}/approve/`),

  reject: (id: number, reason: string) => api.post(`/admin/applications/${id}/reject/`, { reason }),

  requestInfo: (id: number, notes: string) => api.post(`/admin/applications/${id}/request-info/`, { notes }),

  setUserLimit: (id: number, max_secondary_users: number) =>
    api.patch(`/admin/applications/${id}/set-user-limit/`, { max_secondary_users }),

  verifyDocument: (fpoId: number, docId: number) => api.post(`/admin/applications/${fpoId}/verify-document/${docId}/`),

  getTierHistory: (fpoId: number): Promise<TierAuditLogEntry[]> =>
    api
      .get("/admin/audit-logs/", { params: { action: "tier_recalculation", fpo_id: fpoId } })
      .then((r) => {
        const d = r.data as Record<string, unknown>;
        return (d.data ?? d.results ?? []) as TierAuditLogEntry[];
      }),

  assignTier: (fpoId: number, payload: AssignTierPayload): Promise<void> =>
    api.post(`/admin/applications/${fpoId}/assign-tier/`, payload).then(() => undefined),
};
