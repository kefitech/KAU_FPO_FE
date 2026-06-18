import { api } from "@/lib/api/client";
import type { FpoScheme } from "@/types/fpo";

type ListResponse = { status: string; data: FpoScheme[] };

export const schemesApi = {
  list: (params?: { category?: string; search?: string }): Promise<FpoScheme[]> =>
    api.get<ListResponse>("/fpo/schemes/", { params }).then((r) => r.data.data),

  get: (id: number): Promise<FpoScheme> =>
    api.get<{ status: string; data: FpoScheme }>(`/fpo/schemes/${id}/`).then((r) => r.data.data),
};
