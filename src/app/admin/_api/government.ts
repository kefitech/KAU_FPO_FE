import { api } from "@/lib/api/client";
import type { AvailableDistrict, GovernmentOfficial, GovernmentPayload, GovernmentUpdatePayload, GovtJurisdictionType } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/government/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const governmentApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<GovernmentOfficial>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<GovernmentOfficial>>(`${BASE}${id}/`).then(unwrap),
  create: (payload: GovernmentPayload) => api.post<Wrapped<GovernmentOfficial>>(BASE, payload).then(unwrap),
  update: (id: number, payload: GovernmentUpdatePayload) =>
    api.patch<Wrapped<GovernmentOfficial>>(`${BASE}${id}/`, payload).then(unwrap),
  delete: (id: number) => api.delete(`${BASE}${id}/`),
  activate: (id: number) => api.post<Wrapped<GovernmentOfficial>>(`${BASE}${id}/activate/`).then(unwrap),
  deactivate: (id: number) => api.post<Wrapped<GovernmentOfficial>>(`${BASE}${id}/deactivate/`).then(unwrap),
  resetPassword: (id: number, notification_channel?: "email" | "sms") =>
    api.post<Wrapped<GovernmentOfficial>>(`${BASE}${id}/reset-password/`, { notification_channel }).then(unwrap),
  setJurisdiction: (
    id: number,
    jurisdiction_type: GovtJurisdictionType,
    assigned_district?: string | null,
    assigned_block?: string | null
  ) =>
    api.post<Wrapped<GovernmentOfficial>>(`${BASE}${id}/jurisdiction/`, {
      jurisdiction_type,
      assigned_district,
      assigned_block,
    }).then(unwrap),
  getAvailableDistricts: () => api.get<Wrapped<AvailableDistrict[]>>(`${BASE}available-districts/`).then(unwrap),
  getAvailableBlocks: () => api.get<Wrapped<AvailableDistrict[]>>(`${BASE}available-blocks/`).then(unwrap),
  getPending: () => api.get<Wrapped<GovernmentOfficial[]>>(`${BASE}pending/`).then(unwrap),
  approveRegistration: (id: number) =>
    api.post<Wrapped<GovernmentOfficial>>(`${BASE}${id}/approve-registration/`).then(unwrap),
  rejectRegistration: (id: number) =>
    api.post<Wrapped<GovernmentOfficial>>(`${BASE}${id}/reject-registration/`).then(unwrap),
};
