import { api } from "@/lib/api/client";
import type { ExternalApi, ExternalApiPayload, ExternalApiUpdatePayload } from "@/types/admin";

const BASE = "/admin/external-apis/";

type Wrapped<T> = { status: string; message: string; data: T };

const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const externalApisApi = {
  getAll: () => api.get<Wrapped<ExternalApi[]>>(BASE).then((r) => r.data.data ?? r.data),

  getById: (id: number) => api.get<Wrapped<ExternalApi>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: ExternalApiPayload) => api.post<Wrapped<ExternalApi>>(BASE, payload).then(unwrap),

  update: (id: number, payload: ExternalApiUpdatePayload) =>
    api.patch<Wrapped<ExternalApi>>(`${BASE}${id}/`, payload).then(unwrap),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),
};
