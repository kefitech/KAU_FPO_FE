import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

/**
 * One card per **stock batch** — matches BuyerProductSerializer on the
 * backend (apps/marketplace/serializers.py). A product with two live
 * batches appears here as two cards with different quantities and prices.
 *
 * `id` is the ProductStock id — pass it straight to inquire().
 * `product_id` is the parent Product id — use it to navigate to a
 *   "view all batches of this product" page.
 */
export interface BuyerProduct {
  id: number; // ProductStock id
  product_id: number;
  name: { en: string; ml: string };
  description: { en: string; ml: string };
  commodity_code: string;
  commodity_name: string | null;
  quantity: string;
  unit: string;
  price_per_unit: string;
  quality_certification: string;
  available_from: string;
  available_until: string | null;
  fpo: number;
  fpo_name: string;
  image: string | null;
  /** Direct seller phone for this batch (blank = no direct line published). */
  contact_phone: string;
  /** KAU #3 — true when the batch is in the 3-day grace window after its
   *  validity ended. Buyer UI should show the grace_message banner. */
  in_grace_period: boolean;
  grace_message: string | null;
}

export interface BuyerProductParams extends DataTableParams {
  commodity?: string;
  fpo?: string;
  price_min?: string;
  price_max?: string;
  date_from?: string;
  date_until?: string;
  lang?: string;
}
const BASE = "/marketplace/buyer/products/";

export interface InquiryPayload {
  quantity_requested: number;
  message?: string;
}

export const buyerProductsApi = {
  getAll: (params: BuyerProductParams): Promise<PaginatedResponse<BuyerProduct>> =>
    api.get(BASE, { params }).then((r) => r.data as PaginatedResponse<BuyerProduct>),

  getRecommended: (): Promise<BuyerProduct[]> =>
    api.get(`${BASE}recommended/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as BuyerProduct[];
    }),

  /**
   * `stockId` is the id field on BuyerProduct (which is a ProductStock id).
   * The inquiry locks onto the specific batch the buyer saw.
   */
  inquire: (stockId: number, payload: InquiryPayload): Promise<{ inquiry_id: number }> =>
    api.post(`${BASE}${stockId}/inquire/`, payload).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as { inquiry_id: number };
    }),
};
