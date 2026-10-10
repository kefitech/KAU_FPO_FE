import { api } from "@/lib/api/client";
import type { FpoScheme } from "@/types/fpo";
import type { PaginatedResponse } from "@/types/pagination";

type ListResponse = { status: string; data: FpoScheme[] };

export interface SchemeListParams {
  locale?: string;
  category?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export const schemesApi = {
  /** First page only (backend default of 20); use listPage to page through everything. */
  list: (params?: SchemeListParams): Promise<FpoScheme[]> =>
    api.get<ListResponse>("/fpo/schemes/", { params }).then((r) => r.data.data),

  listPage: (params?: SchemeListParams): Promise<PaginatedResponse<FpoScheme>> =>
    api.get<PaginatedResponse<FpoScheme>>("/fpo/schemes/", { params }).then((r) => r.data),

  get: (id: number): Promise<FpoScheme> =>
    api.get<{ status: string; data: FpoScheme }>(`/fpo/schemes/${id}/`).then((r) => r.data.data),
};