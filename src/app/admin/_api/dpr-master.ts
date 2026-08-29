/**
 * Admin DPR master data client — CRUD on the 34 dropdown lists.
 *
 * Endpoints (backend, from Phase 0.4):
 *   GET    /api/admin/dpr/master/<slug>/
 *   POST   /api/admin/dpr/master/<slug>/
 *   GET    /api/admin/dpr/master/<slug>/<id>/
 *   PATCH  /api/admin/dpr/master/<slug>/<id>/
 *   DELETE /api/admin/dpr/master/<slug>/<id>/
 *
 * Every write invalidates the FPO-side Redis cache server-side.
 */

import { api } from "@/lib/api/client";
import type { DprMasterCategory } from "@/lib/api/dpr-master";

type Wrapped<T> = { status: string; data: T; message?: string };

/**
 * A master row from the admin endpoint. Shape varies by category — e.g. component
 * rows include `group`, statutory-registration rows include `category` +
 * `default_mandatory`, etc. Treat unknown keys as extra fields via `[key: string]`.
 */
export interface DprAdminMasterRow {
  id: number;
  code: string;
  label_en: string;
  label_ml: string;
  order: number;
  is_active: boolean;
  [key: string]: unknown;
}

export type DprAdminMasterPayload = Omit<DprAdminMasterRow, "id"> & { id?: number };

export const dprAdminMasterApi = {
  list: (category: DprMasterCategory): Promise<DprAdminMasterRow[]> =>
    api
      .get<Wrapped<DprAdminMasterRow[]>>(`/admin/dpr/master/${category}/`)
      .then((r) => r.data.data),

  create: (
    category: DprMasterCategory,
    payload: DprAdminMasterPayload,
  ): Promise<DprAdminMasterRow> =>
    api
      .post<Wrapped<DprAdminMasterRow>>(`/admin/dpr/master/${category}/`, payload)
      .then((r) => r.data.data),

  update: (
    category: DprMasterCategory,
    id: number,
    payload: Partial<DprAdminMasterPayload>,
  ): Promise<DprAdminMasterRow> =>
    api
      .patch<Wrapped<DprAdminMasterRow>>(
        `/admin/dpr/master/${category}/${id}/`,
        payload,
      )
      .then((r) => r.data.data),

  delete: (category: DprMasterCategory, id: number): Promise<void> =>
    api.delete(`/admin/dpr/master/${category}/${id}/`).then(() => undefined),
};

// ── Category catalog (for the admin sidebar) ───────────────────────────────

export interface DprMasterCategoryGroup {
  label: string;
  categories: { slug: DprMasterCategory; label: string }[];
}

export const DPR_MASTER_GROUPS: DprMasterCategoryGroup[] = [
  {
    label: "Project Definition",
    categories: [
      { slug: "project-types", label: "Project Types" },
      { slug: "project-objectives", label: "Project Objectives" },
      { slug: "project-outcomes", label: "Expected Outcomes" },
      { slug: "project-rationales", label: "Project Rationales" },
      { slug: "nature-of-business", label: "Nature of Business" },
      { slug: "components", label: "Project Components" },
    ],
  },
  {
    label: "Capacity & Products",
    categories: [
      { slug: "capacity-units", label: "Capacity Units" },
      { slug: "capacity-basis", label: "Capacity Basis" },
      { slug: "product-types", label: "Product Types" },
      { slug: "product-categories", label: "Product Categories" },
    ],
  },
  {
    label: "Raw Material & Quality",
    categories: [
      { slug: "raw-material-sources", label: "Raw Material Sources" },
      { slug: "procurement-models", label: "Procurement Models" },
      { slug: "quality-parameters", label: "Quality Parameters" },
      { slug: "quality-standards", label: "Quality Standards" },
    ],
  },
  {
    label: "Market",
    categories: [
      { slug: "marketing-channels", label: "Marketing Channels" },
      { slug: "customer-categories", label: "Customer Categories" },
      { slug: "buyer-types", label: "Buyer Types" },
      { slug: "promotional-activities", label: "Promotional Activities" },
      { slug: "technology-reasons", label: "Technology Reasons" },
      { slug: "intended-markets", label: "Intended Markets" },
    ],
  },
  {
    label: "Infrastructure & Machinery",
    categories: [
      { slug: "land-ownership-types", label: "Land Ownership Types" },
      { slug: "site-statuses", label: "Site Statuses" },
      { slug: "building-types", label: "Building Types" },
      { slug: "civil-categories", label: "Civil Categories" },
      { slug: "machinery-categories", label: "Machinery Categories" },
      { slug: "supporting-assets", label: "Supporting Assets" },
    ],
  },
  {
    label: "Utilities & HR",
    categories: [
      { slug: "fuel-types", label: "Fuel Types" },
      { slug: "waste-types", label: "Waste Types" },
      { slug: "renewable-initiatives", label: "Renewable Initiatives" },
      { slug: "training-areas", label: "Training Areas" },
    ],
  },
  {
    label: "Environment & Risk",
    categories: [
      { slug: "environmental-impacts", label: "Environmental Impacts" },
      { slug: "climate-risks", label: "Climate Risks" },
      { slug: "risk-categories", label: "Risk Categories" },
    ],
  },
  {
    label: "Compliance",
    categories: [
      { slug: "statutory-registrations", label: "Statutory Registrations" },
    ],
  },
];
