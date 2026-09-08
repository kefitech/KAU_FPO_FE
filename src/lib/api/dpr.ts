/**
 * DPR v2 API client — mirrors backend Phase 2 endpoints at /api/fpo/dpr/*.
 *
 * Section shapes are intentionally typed as `Record<string, unknown>` at this
 * layer — each section's form file defines its own zod schema and tightens the
 * type locally when needed. Keeps this client stable across all 21 sections.
 *
 * Backend response wrapper is StandardResponse: { status, data, message }.
 * All methods here unwrap to the inner `data`.
 */

import { api } from "@/lib/api/client";

// ── Response wrapper helper ─────────────────────────────────────────────────

type Wrapped<T> = { status: string; data: T; message?: string };

// ── Core project types ──────────────────────────────────────────────────────

export type DprStatus = "draft" | "in_progress" | "submitted" | "generated";

export interface DprProject {
  uuid: string;
  title: string;
  status: DprStatus;
  created_at: string;
  updated_at: string;
}

// ── Readiness result shape (returned by every section's /readiness/ endpoint) ─

export interface DprReadinessIssue {
  code: string;
  field: string;
  message: string;
}

export interface DprReadiness {
  errors: DprReadinessIssue[];
  warnings: DprReadinessIssue[];
  is_complete: boolean;
}

/** Rule engine applicability payload — Phase 6d (KAU RCD A.1). */
export type DprApplicabilityValue = "M" | "O" | "H";

export interface DprApplicability {
  /** Feature flag — when false, treat all sections as visible (rollback state). */
  engine_enabled: boolean;
  /** Per-section M/O/H — covers every known section key. */
  applicability: Record<string, DprApplicabilityValue>;
  /** Canonical-order list of section keys the sidebar should render. */
  visible_sections: string[];
  /** Section keys marked Mandatory — used by readiness badges. */
  mandatory_sections: string[];
}

// ── Section registry — source of truth for wizard navigation ────────────────

export type DprSectionKey =
  | "identification"
  | "components"
  | "nature-of-business"
  | "investment"
  | "products"
  | "location"
  | "rationale"
  | "baseline"
  | "capacity"
  | "raw-material"
  | "market"
  | "technology"
  | "site"
  | "civil"
  | "machinery"
  | "utilities"
  | "hr"
  | "finance"
  | "compliance"
  | "ess"
  | "implementation"
  | "risk";

export interface DprSectionInfo {
  key: DprSectionKey;
  title: string;
  specRef: string; // e.g. "§2.3.2"
  group: "Project Identification" | "Project Definition" | "Project Execution";
}

/**
 * All 21 KAU spec data elements in the order the wizard displays them.
 * Grouped into two streams matching BUILD_PLAN.md.
 */
export const DPR_SECTIONS: readonly DprSectionInfo[] = [
  // Project Identification (§2.2 — header form: title, type, description, commodities, objectives, outcomes)
  { key: "identification", title: "Project Identification", specRef: "§2.2", group: "Project Identification" },
  // Project Definition (Stream A)
  { key: "components", title: "Project Components", specRef: "§2.3.2", group: "Project Definition" },
  { key: "nature-of-business", title: "Nature of Business", specRef: "§2.3.3", group: "Project Definition" },
  { key: "investment", title: "Proposed Investment", specRef: "§2.3.4", group: "Project Definition" },
  { key: "products", title: "Products & Services", specRef: "§2.3.5", group: "Project Definition" },
  { key: "location", title: "Project Location", specRef: "§2.3.6", group: "Project Definition" },
  { key: "rationale", title: "Project Rationale", specRef: "§2.3.7", group: "Project Definition" },
  { key: "baseline", title: "Current Status", specRef: "§2.3.8", group: "Project Definition" },
  { key: "capacity", title: "Capacity & Production", specRef: "§2.3.9", group: "Project Definition" },
  { key: "raw-material", title: "Raw Material", specRef: "§2.3.10", group: "Project Definition" },
  { key: "market", title: "Market Assessment", specRef: "§2.3.11", group: "Project Definition" },
  // Project Execution (Stream B)
  { key: "technology", title: "Technology Selection", specRef: "§2.3.12", group: "Project Execution" },
  { key: "site", title: "Land & Site", specRef: "§2.3.13", group: "Project Execution" },
  { key: "civil", title: "Civil Works", specRef: "§2.3.14", group: "Project Execution" },
  { key: "machinery", title: "Plant & Machinery", specRef: "§2.3.15", group: "Project Execution" },
  { key: "utilities", title: "Utilities", specRef: "§2.3.16", group: "Project Execution" },
  { key: "hr", title: "Human Resources", specRef: "§2.3.17", group: "Project Execution" },
  { key: "finance", title: "Finance", specRef: "§2.3.18", group: "Project Execution" },
  { key: "compliance", title: "Statutory Compliance", specRef: "§2.3.19", group: "Project Execution" },
  { key: "ess", title: "Environment & Sustainability", specRef: "§2.3.20", group: "Project Execution" },
  { key: "implementation", title: "Implementation Plan", specRef: "§2.3.21", group: "Project Execution" },
  { key: "risk", title: "Risk Assessment", specRef: "§2.3.22", group: "Project Execution" },
] as const;

export function findSectionInfo(key: string): DprSectionInfo | undefined {
  return DPR_SECTIONS.find((s) => s.key === key);
}

export const DPR_SECTION_KEYS = DPR_SECTIONS.map((s) => s.key);

// ── API methods ─────────────────────────────────────────────────────────────

type CreateProjectPayload = {
  title?: string;
};

/**
 * Section data is arbitrary JSON. Each section form defines its own zod schema
 * + inferred type; call `getSection<MySectionShape>(...)` to type-narrow locally.
 */
export type DprSectionData = Record<string, unknown>;

/**
 * §2.2 Project Identification — 7 fields on the DPRProject itself.
 * PATCHable via /fpo/dpr/projects/<uuid>/. Not a "section" under /sections/.
 */
export interface DprProjectIdentification {
  uuid: string;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  project_types: number[];
  brief_description: string;
  primary_commodity: number | null;
  secondary_commodities: number[];
  project_objectives: number[];
  project_objectives_other: string;
  expected_outcomes: number[];
  expected_outcomes_other: string;
  // KAU RCD C.6/C.7 — per-field provenance. Shape: { section_key: { field_name: source } }
  // source ∈ user_entered / ai_inferred / system_default / user_overridden.
  // Absence of a key implies user_entered (default).
  field_sources: Record<string, Record<string, string>>;
}

export const dprApi = {
  // ── Projects ──
  listProjects: (): Promise<DprProject[]> =>
    api.get<Wrapped<DprProject[]>>("/fpo/dpr/projects/").then((r) => r.data.data),

  createProject: (payload: CreateProjectPayload): Promise<DprProject> =>
    api.post<Wrapped<DprProject>>("/fpo/dpr/projects/", payload).then((r) => r.data.data),

  getProject: (uuid: string): Promise<DprProject> =>
    api.get<Wrapped<DprProject>>(`/fpo/dpr/projects/${uuid}/`).then((r) => r.data.data),

  // ── §2.2 Project Identification (project-level, not a section) ──
  getIdentification: (uuid: string): Promise<DprProjectIdentification> =>
    api
      .get<Wrapped<DprProjectIdentification>>(`/fpo/dpr/projects/${uuid}/`)
      .then((r) => r.data.data),

  saveIdentification: (
    uuid: string,
    payload: Partial<DprProjectIdentification>,
  ): Promise<DprProjectIdentification> =>
    api
      .patch<Wrapped<DprProjectIdentification>>(`/fpo/dpr/projects/${uuid}/`, payload)
      .then((r) => r.data.data),

  getIdentificationReadiness: (uuid: string): Promise<DprReadiness> =>
    api
      .get<Wrapped<DprReadiness>>(`/fpo/dpr/projects/${uuid}/readiness/`)
      .then((r) => r.data.data),

  // ── Applicability (Phase 6d — KAU RCD A.1) ──
  // Rule engine surface for the wizard. When `engine_enabled=false` (default
  // rollout state), backend returns every section as 'O' — FE treats that
  // as "show everything" and behaves exactly like it did before Phase 6.
  getApplicability: (uuid: string): Promise<DprApplicability> =>
    api
      .get<Wrapped<DprApplicability>>(`/fpo/dpr/projects/${uuid}/applicability/`)
      .then((r) => r.data.data),

  // ── Sections (unified GET/PATCH for all 21 sections) ──
  getSection: <T extends DprSectionData = DprSectionData>(
    uuid: string,
    key: DprSectionKey,
  ): Promise<T> =>
    api
      .get<Wrapped<T>>(`/fpo/dpr/projects/${uuid}/sections/${key}/`)
      .then((r) => r.data.data),

  saveSection: <T extends DprSectionData = DprSectionData>(
    uuid: string,
    key: DprSectionKey,
    payload: Partial<T>,
  ): Promise<T> =>
    api
      .patch<Wrapped<T>>(`/fpo/dpr/projects/${uuid}/sections/${key}/`, payload)
      .then((r) => r.data.data),

  // ── Readiness (validators, no save) ──
  getReadiness: (uuid: string, key: DprSectionKey): Promise<DprReadiness> =>
    api
      .get<Wrapped<DprReadiness>>(`/fpo/dpr/projects/${uuid}/sections/${key}/readiness/`)
      .then((r) => r.data.data),

  // ── Phase 3 — 10-year financial calculation + PDF download ──
  // Backend: apps/fpo/api/dpr/calculation.py. Returns the full CalculationResult
  // tree — Decimals are strings (parse to Number on FE), booleans are booleans.
  getCalculation: (uuid: string): Promise<DprCalculationResult> =>
    api
      .get<Wrapped<DprCalculationResult>>(`/fpo/dpr/projects/${uuid}/calculation/`)
      .then((r) => r.data.data),

  // Downloads the PDF as a Blob so the FE can trigger a file save without
  // navigating away. `responseType: 'blob'` is critical — the default JSON
  // parse would corrupt binary PDF bytes.
  // `timeout: 30s` — WeasyPrint takes ~3-4s today; 30s is generous head-room.
  // If backend hangs (e.g. malformed template) the FE toast surfaces the
  // failure instead of spinning forever. See apps/fpo/api/dpr/calculation.py
  // DPRPdfDownloadView docstring for the sync-now, Celery-later trigger.
  downloadPdf: (uuid: string): Promise<Blob> =>
    api
      .get<Blob>(`/fpo/dpr/projects/${uuid}/pdf/`, {
        responseType: "blob",
        timeout: 30_000,
      })
      .then((r) => r.data),

  // ── Versioned DPR document endpoints (KAU pre-UAT reply §7.1 + §7.2) ──
  // Generate a new versioned DPRDocument (monotonic per-project version, never
  // resets). Returns row metadata — the PDF bytes are fetched separately via
  // `downloadDocument()` so the list can show version + timestamp + status
  // before the user opens the file.
  generateDocument: (uuid: string): Promise<DprDocument> =>
    api
      .post<Wrapped<DprDocument>>(`/fpo/dpr/projects/${uuid}/documents/generate/`, {}, {
        timeout: 30_000,
      })
      .then((r) => r.data.data),

  // List all generated documents (newest first). Excludes archived by default.
  listDocuments: (uuid: string, includeArchived = false): Promise<DprDocument[]> =>
    api
      .get<Wrapped<DprDocument[]>>(`/fpo/dpr/projects/${uuid}/documents/`, {
        params: includeArchived ? { include_archived: "true" } : undefined,
      })
      .then((r) => r.data.data),

  // Download a specific version's PDF bytes. Backend returns FileResponse;
  // treat as blob same as the legacy preview endpoint.
  downloadDocument: (uuid: string, versionNumber: number): Promise<Blob> =>
    api
      .get<Blob>(`/fpo/dpr/projects/${uuid}/documents/${versionNumber}/download/`, {
        responseType: "blob",
        timeout: 30_000,
      })
      .then((r) => r.data),

  // Download the projected financials as an .xlsx workbook (KAU pre-UAT §6.3).
  // Multi-sheet: Summary / Cost & MoF / Capital / Depreciation / Interest /
  // P&L / Cash Flow / Balance Sheet / Ratios / DSCR. Same calc engine as the PDF.
  downloadFinancialsExcel: (uuid: string): Promise<Blob> =>
    api
      .get<Blob>(`/fpo/dpr/projects/${uuid}/financials/excel/`, {
        responseType: "blob",
        timeout: 30_000,
      })
      .then((r) => r.data),
};

// ─────────────────────────────────────────────────────────────────────────────
// DPRDocument — versioned PDF row (KAU pre-UAT reply §7.1 + §7.2)
// ─────────────────────────────────────────────────────────────────────────────

export type DprDocumentStatus = "draft" | "user_edited" | "final";

export interface DprDocument {
  id: number;
  version_number: number;
  file_url: string;
  file_size: number;
  generated_at: string;
  status: DprDocumentStatus;
  status_display: string;
  is_archived: boolean;
  filename: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CalculationResult shape — mirrors dataclasses in apps/fpo/services/dpr/calculation.py
// ─────────────────────────────────────────────────────────────────────────────

/** All monetary values arrive as strings (backend Decimal preservation).
 *  Consumers should Number() them at the render site, not here. */
type DecStr = string;

export interface DprCalculationResult {
  projection_years: number;
  cost: { total: DecStr; by_field: Record<string, DecStr> };
  mof: { total: DecStr; by_field: Record<string, DecStr> };
  variance: {
    cost_total: DecStr;
    mof_total: DecStr;
    delta: DecStr;
    pct: DecStr;
    threshold_pct: DecStr;
    exceeds_threshold: boolean;
  };
  capital_schedule: {
    implementation_period_months: number;
    rows: Array<{
      month: number;
      cost_incurred: DecStr;
      mof_received: DecStr;
      cumulative_cost: DecStr;
      cumulative_mof: DecStr;
      unfunded_balance: DecStr;
    }>;
    final_cost: DecStr;
    final_mof: DecStr;
    distribution_note: string;
    is_estimated: boolean;
    reconciliation: Record<string, [DecStr, DecStr, DecStr]>;
  } | null;
  depreciation: {
    projection_years: number;
    classes: Array<{
      key: string;
      label: string;
      rate_pct: DecStr;
      initial_cost: DecStr;
      is_depreciable: boolean;
      rows: Array<{
        year: number;
        opening_gross: DecStr;
        addition: DecStr;
        opening_accum_dep: DecStr;
        depreciation: DecStr;
        closing_gross: DecStr;
        closing_accum_dep: DecStr;
        net_block: DecStr;
      }>;
    }>;
    total_depreciation_by_year: Record<string, DecStr>;
  } | null;
  interest_schedule: {
    projection_years: number;
    loan_amount: DecStr;
    interest_rate_pct: DecStr;
    tenure_years: number;
    moratorium_months: number;
    rows: Array<{
      year: number;
      opening_balance: DecStr;
      interest: DecStr;
      principal: DecStr;
      closing_balance: DecStr;
    }>;
  } | null;
  profit_loss: {
    projection_years: number;
    total_pat: DecStr;
    cumulative_pat_by_year: Record<string, DecStr>;
    rows: Array<{
      year: number;
      revenue: DecStr;
      operating_cost: DecStr;
      ebitda: DecStr;
      depreciation: DecStr;
      ebit: DecStr;
      interest: DecStr;
      pbt: DecStr;
      tax: DecStr;
      pat: DecStr;
    }>;
  } | null;
  cash_flow: {
    projection_years: number;
    ending_cash: DecStr;
    rows: Array<{
      year: number;
      pat: DecStr;
      depreciation_addback: DecStr;
      working_capital_change: DecStr;
      cash_from_operations: DecStr;
      capex: DecStr;
      cash_from_investing: DecStr;
      mof_inflow: DecStr;
      loan_principal_repayment: DecStr;
      cash_from_financing: DecStr;
      net_cash_flow: DecStr;
      opening_cash: DecStr;
      closing_cash: DecStr;
    }>;
  } | null;
  balance_sheet: {
    projection_years: number;
    all_years_balanced: boolean;
    max_invariant_delta: DecStr;
    rows: Array<{
      year: number;
      land: DecStr;
      cwip: DecStr;
      gross_fixed_assets: DecStr;
      accumulated_depreciation: DecStr;
      net_fixed_assets: DecStr;
      working_capital: DecStr;
      cash_and_bank: DecStr;
      total_assets: DecStr;
      promoter_equity: DecStr;
      capital_reserve: DecStr;
      retained_earnings: DecStr;
      total_equity: DecStr;
      term_loan_outstanding: DecStr;
      other_liabilities: DecStr;
      total_liabilities: DecStr;
      total_equity_and_liabilities: DecStr;
      invariant_delta: DecStr;
      invariant_ok: boolean;
    }>;
  } | null;
  ratios: {
    discount_rate_pct: DecStr;
    npv: DecStr;
    irr_pct: DecStr | null;
    irr_converged: boolean;
    dscr_min: DecStr | null;
    dscr_avg: DecStr | null;
    payback_period_years: DecStr | null;
    break_even_year: number | null;
    dscr_rows: Array<{
      year: number;
      numerator: DecStr;
      denominator: DecStr;
      dscr: DecStr | null;
    }>;
  } | null;
}
