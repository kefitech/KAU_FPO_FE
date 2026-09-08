/**
 * DPR Capital Tranches admin API wrapper.
 *
 * Backend: apps/accounts/api/admin/dpr/tranches.py (created 2026-09-02 for
 * KAU RCD A.3 / B.8). Each tranche is a dated inflow (promoter contribution,
 * loan drawdown, subsidy release) or outflow (capex) — the DPR calc engine
 * reads these to build a time-phased capital schedule. When absent, the
 * calc falls back to uniform-monthly with `is_estimated=true`.
 *
 * Endpoints (per project):
 *   GET    /api/admin/dpr/projects/<uuid>/tranches/          → list
 *   POST   /api/admin/dpr/projects/<uuid>/tranches/          → create (super_admin)
 *   GET    /api/admin/dpr/projects/<uuid>/tranches/<pk>/     → retrieve
 *   PATCH  /api/admin/dpr/projects/<uuid>/tranches/<pk>/     → update (super_admin)
 *   DELETE /api/admin/dpr/projects/<uuid>/tranches/<pk>/     → remove (super_admin)
 */
import { api } from "@/lib/api/client";

// Keep in sync with apps/database/models/dpr/tranche.py::DPRCapitalTranche.TrancheType.
export type TrancheType =
  // Inflows
  | "promoter_contribution"
  | "loan_disbursement"
  | "subsidy_release"
  | "grant_receipt"
  | "other_inflow"
  // Outflows
  | "capex_land"
  | "capex_civil"
  | "capex_machinery"
  | "capex_equipment"
  | "capex_utilities"
  | "capex_pre_operative"
  | "capex_other";

export const TRANCHE_TYPE_LABELS: Record<TrancheType, string> = {
  promoter_contribution: "Promoter contribution",
  loan_disbursement: "Loan disbursement",
  subsidy_release: "Subsidy release",
  grant_receipt: "Grant receipt",
  other_inflow: "Other inflow",
  capex_land: "Capex — land",
  capex_civil: "Capex — civil works",
  capex_machinery: "Capex — plant & machinery",
  capex_equipment: "Capex — equipment",
  capex_utilities: "Capex — utilities",
  capex_pre_operative: "Capex — pre-operative expenses",
  capex_other: "Capex — other",
};

export const INFLOW_TYPES: ReadonlyArray<TrancheType> = [
  "promoter_contribution",
  "loan_disbursement",
  "subsidy_release",
  "grant_receipt",
  "other_inflow",
];

export const OUTFLOW_TYPES: ReadonlyArray<TrancheType> = [
  "capex_land",
  "capex_civil",
  "capex_machinery",
  "capex_equipment",
  "capex_utilities",
  "capex_pre_operative",
  "capex_other",
];

export interface DPRCapitalTranche {
  id: number;
  tranche_type: TrancheType;
  tranche_type_display: string;
  // Amount arrives as a string (backend Decimal precision); parse to Number
  // at render sites, not here.
  amount: string;
  expected_month: number;
  is_actual: boolean;
  description: string;
  finance_field: string;
  is_inflow: boolean;
  is_outflow: boolean;
  created_at: string;
  updated_at: string;
}

export interface DPRCapitalTrancheInput {
  tranche_type: TrancheType;
  amount: string | number;
  expected_month: number;
  is_actual?: boolean;
  description?: string;
  finance_field?: string;
}

interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

const base = (projectUuid: string) => `/admin/dpr/projects/${projectUuid}/tranches/`;

export const dprTranchesApi = {
  list: (projectUuid: string) =>
    api.get<Wrapped<DPRCapitalTranche[]>>(base(projectUuid)).then((r) => r.data.data),

  create: (projectUuid: string, payload: DPRCapitalTrancheInput) =>
    api.post<Wrapped<DPRCapitalTranche>>(base(projectUuid), payload).then((r) => r.data.data),

  update: (projectUuid: string, id: number, patch: Partial<DPRCapitalTrancheInput>) =>
    api.patch<Wrapped<DPRCapitalTranche>>(`${base(projectUuid)}${id}/`, patch).then((r) => r.data.data),

  remove: (projectUuid: string, id: number) =>
    api.delete(`${base(projectUuid)}${id}/`).then((r) => r.data),
};
