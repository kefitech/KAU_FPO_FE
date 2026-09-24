import { api } from "@/lib/api/client";
import type { GovtScheme, GovtSchemePayload } from "@/types/government";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/government/schemes/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const govtSchemesApi = {
  getAll: (params?: DataTableParams) =>
    api.get<PaginatedResponse<GovtScheme>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<GovtScheme>>(`${BASE}${id}/`).then(unwrap),
  create: (payload: GovtSchemePayload) => api.post<Wrapped<GovtScheme>>(BASE, payload).then(unwrap),
  update: (id: number, payload: Partial<GovtSchemePayload>) =>
    api.patch<Wrapped<GovtScheme>>(`${BASE}${id}/`, payload).then(unwrap),
};
