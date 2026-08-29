import { api } from "@/lib/api/client";
import type { Product } from "@/types/fpo";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/market-linkage/";

export interface LinkageFPO {
  id: number;
  name: string;
  name_ml: string;
}

export const marketLinkageApi = {
  getFPOs: (params: DataTableParams): Promise<PaginatedResponse<LinkageFPO>> =>
    api.get(`${BASE}fpos/`, { params }).then((r) => r.data as PaginatedResponse<LinkageFPO>),

  getProductsByFPO: (fpoId: number): Promise<PaginatedResponse<Product>> =>
    api
      .get(`${BASE}fpos/${fpoId}/products/`, { params: { page_size: 100 } })
      .then((r) => r.data as PaginatedResponse<Product>),
};
