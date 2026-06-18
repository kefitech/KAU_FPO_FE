import { api } from "@/lib/api/client";
import type { FpoMemberRole, FpoMemberRoleDetail, FpoMemberRoleLabeled, FpoMemberRolePayload } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/fpo-member-roles/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const fpoMemberRolesApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<FpoMemberRole>>(BASE, { params }).then((r) => r.data),

  getAllLabeled: (params?: DataTableParams) =>
    api.get<PaginatedResponse<FpoMemberRoleLabeled>>(BASE, { params: { ...params, labels: true } }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<FpoMemberRoleDetail>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: FpoMemberRolePayload) => api.post<Wrapped<FpoMemberRoleDetail>>(BASE, payload).then(unwrap),

  update: (id: number, payload: Partial<FpoMemberRolePayload>) =>
    api.patch<Wrapped<FpoMemberRoleDetail>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),
};
