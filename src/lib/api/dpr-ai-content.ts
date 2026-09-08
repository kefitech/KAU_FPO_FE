/**
 * DPR AI Content — FPO-facing API wrapper.
 *
 * Backend: apps/fpo/api/dpr/ai_content.py (created 2026-09-03 for KAU RCD B.5).
 * Regeneration writes to a `candidate_regen` slot; the user then picks
 * Accept / Keep / Merge — nothing auto-overwrites the live version.
 *
 * Endpoints (all under /api/fpo/dpr/projects/<uuid>/):
 *   GET    /ai-content/                          → list all 11 chapters
 *   GET    /ai-content/<chapter>/                → chapter detail
 *   PATCH  /ai-content/<chapter>/                → in-place edit user_edited
 *   POST   /ai-content/<chapter>/generate/       → produce candidate
 *   POST   /ai-content/<chapter>/accept/         → candidate → active
 *   POST   /ai-content/<chapter>/keep/           → discard candidate
 *   POST   /ai-content/<chapter>/merge/          → body {text} → active
 *   GET    /ai-content/<chapter>/kb-preview/     → KB entries next-gen would use
 */
import { apiClient } from "./client";

// Keep chapter list in sync with apps/database/models/dpr/ai_content.py
// (CHAPTER_KEYS). Order matches the DPR PDF rendering order.
export type ChapterKey =
  | "executive_summary"
  | "project_background"
  | "promoter_profile"
  | "market_analysis"
  | "technical_feasibility"
  | "implementation_plan"
  | "financial_analysis"
  | "risk_analysis"
  | "swot"
  | "environmental_impact"
  | "conclusion";

export const CHAPTER_ORDER: ReadonlyArray<ChapterKey> = [
  "executive_summary",
  "project_background",
  "promoter_profile",
  "market_analysis",
  "technical_feasibility",
  "implementation_plan",
  "financial_analysis",
  "risk_analysis",
  "swot",
  "environmental_impact",
  "conclusion",
];

export const CHAPTER_LABELS: Record<ChapterKey, string> = {
  executive_summary: "Executive Summary",
  project_background: "Project Background",
  promoter_profile: "Promoter Profile",
  market_analysis: "Market Analysis",
  technical_feasibility: "Technical Feasibility",
  implementation_plan: "Implementation Plan",
  financial_analysis: "Financial Analysis",
  risk_analysis: "Risk Analysis",
  swot: "SWOT Analysis",
  environmental_impact: "Environmental Impact",
  conclusion: "Conclusion",
};

export interface AIContentRow {
  id: number;
  chapter: ChapterKey;
  chapter_display: string;
  /** Which DPR section keys feed this chapter — for the stale-source tooltip. */
  upstream_sections: string[];
  original_ai: string;
  user_edited: string;
  candidate_regen: string;
  original_ai_kb_ids: number[];
  candidate_regen_kb_ids: number[];
  active_kb_ids: number[];
  has_original: boolean;
  has_candidate: boolean;
  has_active: boolean;
  active_version: "original_ai" | "user_edited";
  is_stale: boolean;
  stale_reason: string;
  generated_at: string | null;
  candidate_generated_at: string | null;
  updated_at: string;
}

export interface KBPreviewEntry {
  id: number;
  source_type: string;
  source_name: string;
  title: string;
  via_section: string | null;
}

interface Wrapped<T> {
  data: T;
  message: string;
  status: string;
}

const base = (uuid: string) => `/fpo/dpr/projects/${uuid}/ai-content`;

export const dprAiContentApi = {
  list: (uuid: string) =>
    apiClient
      .get<Wrapped<AIContentRow[]>>(`${base(uuid)}/`)
      .then((r) => r.data.data),

  retrieve: (uuid: string, chapter: ChapterKey) =>
    apiClient
      .get<Wrapped<AIContentRow>>(`${base(uuid)}/${chapter}/`)
      .then((r) => r.data.data),

  /** In-place edit of the active `user_edited` slot. */
  editActive: (uuid: string, chapter: ChapterKey, text: string) =>
    apiClient
      .patch<Wrapped<AIContentRow>>(`${base(uuid)}/${chapter}/`, {
        user_edited: text,
      })
      .then((r) => r.data.data),

  /** Produce a new candidate (writes to candidate_regen). */
  generate: (uuid: string, chapter: ChapterKey) =>
    apiClient
      .post<Wrapped<AIContentRow>>(`${base(uuid)}/${chapter}/generate/`)
      .then((r) => r.data.data),

  /** Accept candidate → promotes to active. */
  accept: (uuid: string, chapter: ChapterKey) =>
    apiClient
      .post<Wrapped<AIContentRow>>(`${base(uuid)}/${chapter}/accept/`)
      .then((r) => r.data.data),

  /** Discard candidate, keep existing active. */
  keep: (uuid: string, chapter: ChapterKey) =>
    apiClient
      .post<Wrapped<AIContentRow>>(`${base(uuid)}/${chapter}/keep/`)
      .then((r) => r.data.data),

  /** User-merged text becomes active; candidate is cleared. */
  merge: (uuid: string, chapter: ChapterKey, text: string) =>
    apiClient
      .post<Wrapped<AIContentRow>>(`${base(uuid)}/${chapter}/merge/`, { text })
      .then((r) => r.data.data),

  /** Preview which KB entries the next generate call would ground itself in. */
  kbPreview: (uuid: string, chapter: ChapterKey) =>
    apiClient
      .get<Wrapped<{ chapter: string; chapter_label: string; entries: KBPreviewEntry[]; count: number }>>(
        `${base(uuid)}/${chapter}/kb-preview/`,
      )
      .then((r) => r.data.data),
};
