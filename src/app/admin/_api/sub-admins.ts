import { api } from "@/lib/api/client";
import type {
  AvailablePermission,
  BulkInviteResult,
  DistrictCapStatus,
  DistrictTransferRow,
  SubAdmin,
  SubAdminConfig,
  SubAdminConfigPayload,
  SubAdminPayload,
  SubAdminUpdatePayload,
} from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/sub-admins/";

type Wrapped<T> = { status: string; message: string; data: T };

const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const subAdminsApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<SubAdmin>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<SubAdmin>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: SubAdminPayload) => api.post<Wrapped<SubAdmin>>(BASE, payload).then(unwrap),

  update: (id: number, payload: SubAdminUpdatePayload) =>
    api.patch<Wrapped<SubAdmin>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post<Wrapped<SubAdmin>>(`${BASE}${id}/activate/`).then(unwrap),

  deactivate: (id: number) => api.post<Wrapped<SubAdmin>>(`${BASE}${id}/deactivate/`).then(unwrap),

  resetPassword: (id: number, notification_channel?: "email" | "sms") =>
    api.post<Wrapped<SubAdmin>>(`${BASE}${id}/reset-password/`, { notification_channel }).then(unwrap),

  setPermissions: (id: number, action: "add" | "remove" | "replace", permissions: string[]) =>
    api.post<Wrapped<SubAdmin>>(`${BASE}${id}/permissions/`, { action, permissions }).then(unwrap),

  getAvailablePermissions: (params?: DataTableParams) =>
    api.get<PaginatedResponse<AvailablePermission>>(`${BASE}available-permissions/`, { params }).then((r) => r.data),

  // ─── District management (KAU suggestion #1) ────────────────────────────
  transferDistrict: (id: number, to_district: string, reason: string) =>
    api.post<Wrapped<SubAdmin>>(`${BASE}${id}/transfer-district/`, { to_district, reason }).then(unwrap),

  getDistrictTransfers: (id: number) =>
    api.get<Wrapped<DistrictTransferRow[]>>(`${BASE}${id}/district-transfers/`).then(unwrap),

  getDistrictCapStatus: () => api.get<Wrapped<DistrictCapStatus>>(`${BASE}district-cap-status/`).then(unwrap),

  bulkInviteTemplate: () =>
    api.get(`${BASE}bulk-invite-template/`, { responseType: "blob" }).then((r) => r.data as Blob),

  bulkInvite: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<Wrapped<BulkInviteResult>>(`${BASE}bulk-invite/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap);
  },
};

// ─── Sub-admin config (cap + expiry windows) ─────────────────────────────
const CONFIG_BASE = "/admin/sub-admin-config/";

export const subAdminConfigApi = {
  get: () => api.get<Wrapped<SubAdminConfig>>(CONFIG_BASE).then(unwrap),

  patch: (payload: SubAdminConfigPayload) => api.patch<Wrapped<SubAdminConfig>>(CONFIG_BASE, payload).then(unwrap),
};
