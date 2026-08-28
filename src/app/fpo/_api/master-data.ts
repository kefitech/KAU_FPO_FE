import { api } from "@/lib/api/client";

// This endpoint is NOT wrapped in the standard {status, message, data}
// envelope like every other API in this project — it returns a plain
// {category, count, results} object directly. See
// apps/core/api/master_data.py: `return Response({category, count, results})`.

export interface MasterDataItem {
  id: number;
  code: string;
  name: string;
  metadata?: Record<string, unknown>;
}

interface MasterDataResponse {
  category: string;
  count: number;
  results: MasterDataItem[];
}

const BASE = "/public/master-data/";

export const masterDataApi = {
  getByCategory: (category: string, params?: { district?: string; lang?: string }): Promise<MasterDataItem[]> =>
    api.get(BASE, { params: { category, ...params } }).then((r) => {
      const d = r.data as MasterDataResponse;
      return d.results ?? [];
    }),

  getCommodities: (): Promise<MasterDataItem[]> => masterDataApi.getByCategory("commodity"),
};
