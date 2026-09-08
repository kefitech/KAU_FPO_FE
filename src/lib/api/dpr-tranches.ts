/**
 * DPR Capital Tranches — FPO-facing API wrapper.
 *
 * Backend: apps/fpo/api/dpr/tranches.py (created 2026-09-02 for KAU RCD
 * A.3 / B.8). FPO users enter dated inflows (promoter contribution, loan
 * drawdown, subsidy release, grants) and outflows (capex) — the DPR calc
 * engine reads these to build a time-phased capital schedule. Without
 * tranches, the calc engine falls back to uniform monthly split with
 * `is_estimated=true`.
 *
 * Endpoints (per project — user must be primary owner or active secondary):
 *   GET    /api/fpo/dpr/projects/<uuid>/tranches/          → list
 *   POST   /api/fpo/dpr/projects/<uuid>/tranches/          → create
 *   GET    /api/fpo/dpr/projects/<uuid>/tranches/<pk>/     → retrieve
 *   PATCH  /api/fpo/dpr/projects/<uuid>/tranches/<pk>/     → update
 *   DELETE /api/fpo/dpr/projects/<uuid>/tranches/<pk>/     → remove
 *
 * Types deliberately mirror the admin wrapper (src/app/admin/_api/dpr-tranches.ts)
 * so both call sites can share render helpers. Keeping them separate avoids
 * cross-imports between /admin and FPO code paths.
 */
import { apiClient } from "./client";

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
  // Backend Decimal — arrives as string. Parse to Number at render sites,
  // not here, so precision is preserved when round-tripping.
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

const base = (projectUuid: string) => `/fpo/dpr/projects/${projectUuid}/tranches/`;

export const dprTranchesApi = {
  list: (projectUuid: string) =>
    apiClient.get<Wrapped<DPRCapitalTranche[]>>(base(projectUuid)).then((r) => r.data.data),

  create: (projectUuid: string, payload: DPRCapitalTrancheInput) =>
    apiClient
      .post<Wrapped<DPRCapitalTranche>>(base(projectUuid), payload)
      .then((r) => r.data.data),

  update: (projectUuid: string, id: number, patch: Partial<DPRCapitalTrancheInput>) =>
    apiClient
      .patch<Wrapped<DPRCapitalTranche>>(`${base(projectUuid)}${id}/`, patch)
      .then((r) => r.data.data),

  remove: (projectUuid: string, id: number) =>
    apiClient.delete(`${base(projectUuid)}${id}/`).then((r) => r.data),
};
