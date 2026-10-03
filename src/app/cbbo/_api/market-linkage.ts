import type { LinkageFPO, LinkageProduct, LinkageProductParams } from "@/app/admin/_api/market-linkage";
import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

// Same data/shape as the admin Market Linkage API (backend shares
// apps/marketplace/linkage.py), scoped to the CBBO's assigned districts.
const BASE = "/cbbo/market-linkage/";

export const cbboMarketLinkageApi = {
  getFPOs: (params: DataTableParams): Promise<PaginatedResponse<LinkageFPO>> =>
    api.get(`${BASE}fpos/`, { params }).then((r) => r.data as PaginatedResponse<LinkageFPO>),

  getProductsByFPO: (fpoId: number, params: LinkageProductParams): Promise<PaginatedResponse<LinkageProduct>> =>
    api.get(`${BASE}fpos/${fpoId}/products/`, { params }).then((r) => r.data as PaginatedResponse<LinkageProduct>),
};
