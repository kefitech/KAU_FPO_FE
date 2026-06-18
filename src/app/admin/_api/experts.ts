import { api } from "@/lib/api/client";
import type { AdminExpert, AdminExpertPayload, ExpertEnquiry } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/experts/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const adminExpertsApi = {
  getAll: (params: DataTableParams) =>
    api.get<PaginatedResponse<AdminExpert>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<AdminExpert>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: AdminExpertPayload) => api.post<Wrapped<AdminExpert>>(BASE, payload).then(unwrap),

  update: (id: number, payload: Partial<AdminExpertPayload>) =>
    api.patch<Wrapped<AdminExpert>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post<Wrapped<AdminExpert>>(`${BASE}${id}/activate/`).then(unwrap),

  deactivate: (id: number) => api.post<Wrapped<AdminExpert>>(`${BASE}${id}/deactivate/`).then(unwrap),

  getEnquiries: (id: number): Promise<ExpertEnquiry[]> =>
    api.get<{ status: string; data: ExpertEnquiry[] }>(`${BASE}${id}/enquiries/`).then((r) => r.data.data),
};
