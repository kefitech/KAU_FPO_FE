import { api } from "@/lib/api/client";
import type { NotificationTemplateCode, NotificationTemplateCodePayload } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/notifications/template-codes/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const notificationTemplateCodeApi = {
  getAll: (params: DataTableParams) =>
    api.get<PaginatedResponse<NotificationTemplateCode>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<NotificationTemplateCode>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: NotificationTemplateCodePayload) =>
    api.post<NotificationTemplateCode>(BASE, payload).then((r) => r.data),

  update: (id: number, payload: Partial<NotificationTemplateCodePayload>) =>
    api.patch<NotificationTemplateCode>(`${BASE}${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),
};
