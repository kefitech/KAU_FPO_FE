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
};
