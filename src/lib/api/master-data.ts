import { api } from "@/lib/api/client";

export interface MasterDataItem {
  code: string;
  name: string;
  metadata?: Record<string, unknown>;
}

interface MasterDataResponse {
  category: string;
  count: number;
  results: MasterDataItem[];
}

export const masterDataApi = {
  get: (category: string, district?: string): Promise<MasterDataItem[]> => {
    const params: Record<string, string> = { category };
    if (district) params.district = district;
    return api
      .get<MasterDataResponse>("/public/master-data/", { params })
      .then((r) => r.data.results);
  },
};
