import { api } from "@/lib/api/client";
import type { AvailableDistrict, CBBO, CBBOPayload, CBBOUpdatePayload } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/cbbos/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const cbbosApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<CBBO>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<CBBO>>(`${BASE}${id}/`).then(unwrap),
  create: (payload: CBBOPayload) => api.post<Wrapped<CBBO>>(BASE, payload).then(unwrap),
  update: (id: number, payload: CBBOUpdatePayload) => api.patch<Wrapped<CBBO>>(`${BASE}${id}/`, payload).then(unwrap),
  delete: (id: number) => api.delete(`${BASE}${id}/`),
  activate: (id: number) => api.post<Wrapped<CBBO>>(`${BASE}${id}/activate/`).then(unwrap),
  deactivate: (id: number) => api.post<Wrapped<CBBO>>(`${BASE}${id}/deactivate/`).then(unwrap),
  resetPassword: (id: number, notification_channel?: "email" | "sms") =>
    api.post<Wrapped<CBBO>>(`${BASE}${id}/reset-password/`, { notification_channel }).then(unwrap),
  setDistricts: (id: number, action: "add" | "remove" | "replace", district_codes: string[]) =>
    api.post<Wrapped<CBBO>>(`${BASE}${id}/districts/`, { action, district_codes }).then(unwrap),
  getAvailableDistricts: () => api.get<Wrapped<AvailableDistrict[]>>(`${BASE}available-districts/`).then(unwrap),
  getPending: () => api.get<Wrapped<CBBO[]>>(`${BASE}pending/`).then(unwrap),
  approveRegistration: (id: number) => api.post<Wrapped<CBBO>>(`${BASE}${id}/approve-registration/`).then(unwrap),
  rejectRegistration: (id: number) => api.post<Wrapped<CBBO>>(`${BASE}${id}/reject-registration/`).then(unwrap),
};
