import type { BuyerProduct } from "@/app/buyer/_api/products";
import { api } from "@/lib/api/client";
import type { ProductStatus } from "@/types/fpo";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/market-linkage/";

export interface LinkageFPO {
  id: number;
  name: string;
  name_ml: string;
}

/** Same shape as the buyer catalog product, plus fields only admins see. */
export interface LinkageProduct extends BuyerProduct {
  status: ProductStatus;
  is_public: boolean;
}

export interface LinkageProductParams extends DataTableParams {
  commodity?: string;
  status?: ProductStatus;
}

export const marketLinkageApi = {
  getFPOs: (params: DataTableParams): Promise<PaginatedResponse<LinkageFPO>> =>
    api.get(`${BASE}fpos/`, { params }).then((r) => r.data as PaginatedResponse<LinkageFPO>),

  getProductsByFPO: (fpoId: number, params: LinkageProductParams): Promise<PaginatedResponse<LinkageProduct>> =>
    api.get(`${BASE}fpos/${fpoId}/products/`, { params }).then((r) => r.data as PaginatedResponse<LinkageProduct>),
};
