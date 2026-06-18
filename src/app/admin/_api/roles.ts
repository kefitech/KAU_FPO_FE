import { api } from "@/lib/api/client";
import type { Role, RolePayload } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/auth/roles/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const rolesApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<Role>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<Role>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: RolePayload) => api.post<Wrapped<Role>>(BASE, payload).then(unwrap),

  update: (id: number, payload: Partial<RolePayload>) =>
    api.patch<Wrapped<Role>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number) => api.delete(`${BASE}${id}/`),
};
