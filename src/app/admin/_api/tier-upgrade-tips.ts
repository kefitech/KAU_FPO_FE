import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export type TipTrigger =
  | "score_below_max"
  | "boolean_no"
  | "value_below_threshold"
  | "value_above_threshold"
  | "answer_equals"
  | "answer_not_in"
  | "unanswered"
  | "always";

export interface AdminTierUpgradeTip {
  id: number;
  question_no: number | null;
  criterion_code: string | null;
  trigger_type: TipTrigger;
  trigger_value: Record<string, unknown>;
  tip_en: string;
  tip_ml: string;
  target_tier: "A" | "B" | "C" | "D";
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipPayload {
  question_id?: number | null;
  criterion_id?: number | null;
  trigger_type: TipTrigger;
  trigger_value?: Record<string, unknown>;
  tip_en: string;
  tip_ml?: string;
  target_tier: "A" | "B" | "C" | "D";
  priority: number;
  is_active?: boolean;
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const adminTierUpgradeTipsApi = {
  getAll: (params?: DataTableParams): Promise<PaginatedResponse<AdminTierUpgradeTip>> =>
    api.get<PaginatedResponse<AdminTierUpgradeTip>>("/admin/tier-upgrade-tips/", { params }).then((r) => r.data),

  create: (payload: TipPayload): Promise<AdminTierUpgradeTip> =>
    api.post<Wrapped<AdminTierUpgradeTip>>("/admin/tier-upgrade-tips/", payload).then(unwrap),

  update: (id: number, payload: Partial<TipPayload>): Promise<AdminTierUpgradeTip> =>
    api.patch<Wrapped<AdminTierUpgradeTip>>(`/admin/tier-upgrade-tips/${id}/`, payload).then(unwrap),

  delete: (id: number): Promise<void> =>
    api.delete(`/admin/tier-upgrade-tips/${id}/`).then(() => undefined),

  activate: (id: number): Promise<AdminTierUpgradeTip> =>
    api.post<Wrapped<AdminTierUpgradeTip>>(`/admin/tier-upgrade-tips/${id}/activate/`).then(unwrap),

  deactivate: (id: number): Promise<AdminTierUpgradeTip> =>
    api.post<Wrapped<AdminTierUpgradeTip>>(`/admin/tier-upgrade-tips/${id}/deactivate/`).then(unwrap),

  questions: (): Promise<AdminTierQuestion[]> =>
    api.get<Wrapped<AdminTierQuestion[]>>("/admin/tier-upgrade-tips/questions/").then(unwrap),
};

export interface AdminTierQuestion {
  id: number;
  question_no: number;
  text: string;
  input_type: string;
  criterion_code: string;
  domain_code: string;
}
