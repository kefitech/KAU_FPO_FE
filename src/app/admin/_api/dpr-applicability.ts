/**
 * DPR Applicability — admin API wrapper (Phase 6c).
 *
 * Backend: apps/accounts/api/admin/dpr/applicability.py (KAU RCD A.1).
 * Level 1 rules: for each project component × DPR section, admin picks
 * Mandatory / Optional / Hidden. Missing rules default to Optional.
 *
 * Endpoints:
 *   GET   /admin/dpr/applicability/matrix/  → full matrix (components + rules)
 *   PATCH /admin/dpr/applicability/         → upsert 1 or many cells
 *   DELETE /admin/dpr/applicability/<pk>/   → delete a rule by id
 */
import { api } from "@/lib/api/client";

export type Applicability = "M" | "O" | "H";

export interface ApplicabilityComponent {
  id: number;
  code: string;
  label: string;
  group: string;
  group_label: string;
}

export interface ApplicabilityRuleValue {
  id: number;
  applicability: Applicability;
  notes: string;
}

export interface ApplicabilityMatrix {
  components: ApplicabilityComponent[];
  section_keys: string[];
  /** Keyed by "<component_id>::<section_key>". Sparse — only explicit rules. */
  rules: Record<string, ApplicabilityRuleValue>;
}

/** One cell to upsert. `applicability: null` deletes the rule. */
export interface CellPatch {
  component_id: number;
  data_element_key: string;
  applicability: Applicability | null;
  notes?: string;
}

interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

interface UpsertResponse {
  cells: Array<{
    id?: number;
    component_id: number;
    data_element_key: string;
    applicability: Applicability | null;
    notes: string;
  }>;
  count: number;
}

const BASE = "/admin/dpr/applicability/";

export const dprApplicabilityApi = {
  matrix: () =>
    api.get<Wrapped<ApplicabilityMatrix>>(`${BASE}matrix/`).then((r) => r.data.data),

  /** Single or batch upsert. Backend accepts one cell object or a list. */
  upsert: (cells: CellPatch | CellPatch[]) =>
    api.patch<Wrapped<UpsertResponse>>(BASE, cells).then((r) => r.data),

  /** Delete a rule by id — reverts to default Optional. */
  remove: (id: number) => api.delete(`${BASE}${id}/`).then((r) => r.data),
};

// Display metadata used by the matrix UI to render each cell.
export const APPLICABILITY_META: Record<
  Applicability | "default",
  { label: string; shortLabel: string; tone: string }
> = {
  M: {
    label: "Mandatory",
    shortLabel: "M",
    tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300",
  },
  O: {
    label: "Optional",
    shortLabel: "O",
    tone: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300",
  },
  H: {
    label: "Hidden",
    shortLabel: "H",
    tone: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400",
  },
  default: {
    label: "Optional (default)",
    shortLabel: "—",
    tone: "bg-muted/30 text-muted-foreground",
  },
};
