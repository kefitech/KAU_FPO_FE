import { api } from "@/lib/api/client";
import type { AdminMenuItem, AdminMenuItemPayload } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/menu/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const menuApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<AdminMenuItem>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<AdminMenuItem>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: AdminMenuItemPayload) => api.post<AdminMenuItem>(BASE, payload).then((r) => r.data),

  update: (id: number, payload: Partial<AdminMenuItemPayload>) =>
    api.patch<AdminMenuItem>(`${BASE}${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),
};
