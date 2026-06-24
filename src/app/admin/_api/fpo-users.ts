import { api } from "@/lib/api/client";
import type { FpoUser } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/fpo-users/";

type Wrapped<T> = { status: string; message: string; data: T };

const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const fpoUsersApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<FpoUser>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<FpoUser>>(`${BASE}${id}/`).then(unwrap),

  activate: (id: number) => api.post<Wrapped<FpoUser>>(`${BASE}${id}/activate/`).then(unwrap),

  deactivate: (id: number) => api.post<Wrapped<FpoUser>>(`${BASE}${id}/deactivate/`).then(unwrap),

  resetPassword: (id: number) =>
    api.post<Wrapped<{ message: string }>>(`${BASE}${id}/reset-password/`).then(unwrap),
};
