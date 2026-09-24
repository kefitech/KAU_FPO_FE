import { api } from "@/lib/api/client";
import type { Organisation, OrganisationPayload } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/organisations/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const organisationsApi = {
  getAll: (params?: DataTableParams) =>
    api.get<PaginatedResponse<Organisation>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<Organisation>>(`${BASE}${id}/`).then(unwrap),
  create: (payload: OrganisationPayload) => api.post<Wrapped<Organisation>>(BASE, payload).then(unwrap),
  update: (id: number, payload: Partial<OrganisationPayload>) =>
    api.patch<Wrapped<Organisation>>(`${BASE}${id}/`, payload).then(unwrap),
  delete: (id: number) => api.delete(`${BASE}${id}/`),
};
