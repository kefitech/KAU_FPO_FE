import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface BuyerProduct {
  id: number;
  name: { en: string; ml: string };
  description: { en: string; ml: string };
  commodity_code: string;
  quantity: string;
  unit: string;
  price_per_unit: string;
  quality_certification: string;
  available_from: string;
  available_until: string | null;
  fpo: number;
  fpo_name: string;
  image: string | null;
}

export interface BuyerProductParams extends DataTableParams {
  commodity?: string;
  fpo?: string;
  price_min?: string;
  price_max?: string;
  date_from?: string;
  date_until?: string;
}
const BASE = "/marketplace/buyer/products/";

export interface InquiryPayload {
  quantity_requested: number;
  message?: string;
}

export const buyerProductsApi = {
  getAll: (params: BuyerProductParams): Promise<PaginatedResponse<BuyerProduct>> =>
    api.get(BASE, { params }).then((r) => r.data as PaginatedResponse<BuyerProduct>),

  inquire: (productId: number, payload: InquiryPayload): Promise<{ inquiry_id: number }> =>
    api.post(`${BASE}${productId}/inquire/`, payload).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as { inquiry_id: number };
    }),
};
