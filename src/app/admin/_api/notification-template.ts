import { api } from "@/lib/api/client";
import type { NotificationTemplate, NotificationTemplatePayload } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/notifications/templates/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const notificationTemplateApi = {
  getAll: (params: DataTableParams) =>
    api.get<PaginatedResponse<NotificationTemplate>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<NotificationTemplate>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: NotificationTemplatePayload) => api.post<NotificationTemplate>(BASE, payload).then((r) => r.data),

  update: (id: number, payload: Partial<NotificationTemplatePayload>) =>
    api.patch<NotificationTemplate>(`${BASE}${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),

  testRender: (id: number, context: Record<string, string>) =>
    api.post<{ subject: string; body: string }>(`${BASE}${id}/test_render/`, { context }).then((r) => r.data),
};
