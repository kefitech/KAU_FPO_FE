/**
 * DPR master data helper — fetches the 34 admin-editable dropdown lists
 * from /api/fpo/dpr/master/<slug>/. Cached server-side in Redis (24h TTL);
 * client-side, always wrap calls in React Query with a long staleTime.
 *
 * Kept separate from `master-data.ts` (which hits the cross-platform
 * MasterLookup endpoint for commodity/district/etc.).
 */

import { api } from "@/lib/api/client";

type Wrapped<T> = { status: string; data: T; message?: string };

export interface DprMasterItem {
  id: number;
  code: string;
  label: string; // resolved to X-Language header locale
  label_en: string;
  label_ml: string;
  order: number;
  is_active: boolean;
  /** Structured master rows carry extra fields — group / category / flags / etc. */
  [key: string]: unknown;
}

/**
 * All 34 DPR master categories (kebab-case slugs matching backend URL patterns).
 * Keep in sync with `apps/fpo/api/dpr/urls.py::master_patterns`.
 */
export type DprMasterCategory =
  // Project definition
  | "project-types"
  | "project-objectives"
  | "project-outcomes"
  | "project-rationales"
  | "nature-of-business"
  | "components"
  // Capacity & products
  | "capacity-units"
  | "capacity-basis"
  | "product-types"
  | "product-categories"
  // Raw material & quality
  | "raw-material-sources"
  | "procurement-models"
  | "quality-parameters"
  | "quality-standards"
  // Market
  | "marketing-channels"
  | "customer-categories"
  | "buyer-types"
  | "promotional-activities"
  | "technology-reasons"
  | "intended-markets"
  // Infrastructure & machinery
  | "land-ownership-types"
  | "site-statuses"
  | "building-types"
  | "civil-categories"
  | "machinery-categories"
  | "supporting-assets"
  // Utilities & HR
  | "fuel-types"
  | "waste-types"
  | "renewable-initiatives"
  | "training-areas"
  // Environment & risk
  | "environmental-impacts"
  | "climate-risks"
  | "risk-categories"
  // Compliance
  | "statutory-registrations";

export const dprMasterApi = {
  list: (category: DprMasterCategory): Promise<DprMasterItem[]> =>
    api
      .get<Wrapped<DprMasterItem[]>>(`/fpo/dpr/master/${category}/`)
      .then((r) => r.data.data),
};
