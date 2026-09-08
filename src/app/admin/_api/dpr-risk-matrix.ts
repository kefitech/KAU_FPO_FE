/**
 * DPR Risk Matrix admin API wrapper.
 *
 * Backend: apps/accounts/api/admin/dpr/risk_matrix.py (created 2026-09-02 for
 * KAU RCD B.9). Cells map (probability, impact) → risk_class + numeric score.
 * Editing a cell invalidates a server-side cache so the next DPR compute()
 * call reads fresh values without a server restart.
 *   GET    /api/admin/dpr/risk-matrix/           → { cells, grouped_by_probability, count }
 *   POST   /api/admin/dpr/risk-matrix/           → create (rare — 3×3 default seeded)
 *   PATCH  /api/admin/dpr/risk-matrix/<id>/      → edit risk_class / score (super_admin only)
 *   DELETE /api/admin/dpr/risk-matrix/<id>/      → remove (super_admin only)
 */
import { api } from "@/lib/api/client";

export type RiskLevel = "low" | "medium" | "high";
export type RiskClass = "low" | "moderate" | "high";

export interface DPRRiskMatrixCell {
  id: number;
  probability: RiskLevel;
  impact: RiskLevel;
  risk_class: RiskClass;
  score: number;
  updated_at: string;
}

export interface DPRRiskMatrixListResponse {
  cells: DPRRiskMatrixCell[];
  grouped_by_probability: Partial<Record<RiskLevel, DPRRiskMatrixCell[]>>;
  count: number;
}

interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

const BASE = "/admin/dpr/risk-matrix/";

export const dprRiskMatrixApi = {
  list: () => api.get<Wrapped<DPRRiskMatrixListResponse>>(BASE).then((r) => r.data.data),
  update: (id: number, patch: Partial<Pick<DPRRiskMatrixCell, "risk_class" | "score">>) =>
    api.patch<Wrapped<DPRRiskMatrixCell>>(`${BASE}${id}/`, patch).then((r) => r.data.data),
};
