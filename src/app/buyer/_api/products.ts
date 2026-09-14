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
  fpo_name: string;
}

export interface BuyerProductParams extends DataTableParams {
  commodity?: string;
  price_min?: string;
  price_max?: string;
}

const BASE = "/marketplace/buyer/products/";

export const buyerProductsApi = {
  getAll: (params: BuyerProductParams): Promise<PaginatedResponse<BuyerProduct>> =>
    api.get(BASE, { params }).then((r) => r.data as PaginatedResponse<BuyerProduct>),
};
