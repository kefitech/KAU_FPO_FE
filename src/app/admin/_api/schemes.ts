import { api } from "@/lib/api/client";
import type { AdminScheme, AdminSchemePayload } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/schemes/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const adminSchemesApi = {
  getAll: (params: DataTableParams) =>
    api.get<PaginatedResponse<AdminScheme>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<AdminScheme>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: AdminSchemePayload) => api.post<Wrapped<AdminScheme>>(BASE, payload).then(unwrap),

  update: (id: number, payload: Partial<AdminSchemePayload>) =>
    api.patch<Wrapped<AdminScheme>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post<Wrapped<AdminScheme>>(`${BASE}${id}/activate/`).then(unwrap),

  deactivate: (id: number) => api.post<Wrapped<AdminScheme>>(`${BASE}${id}/deactivate/`).then(unwrap),
};
