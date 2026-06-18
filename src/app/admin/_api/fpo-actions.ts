import { api } from "@/lib/api/client";
import type { FpoAction, FpoActionDetail, FpoActionLabeled, FpoActionPayload } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/fpo-actions/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const fpoActionsApi = {
  // Default list — translations is string[] (language code badges)
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<FpoAction>>(BASE, { params }).then((r) => r.data),

  // List with ?labels=true — translations is a single locale string for the matrix
  getAllLabeled: (params: DataTableParams) =>
    api.get<PaginatedResponse<FpoActionLabeled>>(BASE, { params: { ...params, labels: true } }).then((r) => r.data),

  // Detail — translations is Record<string, string> for pre-filling the edit dialog
  getById: (id: number) => api.get<Wrapped<FpoActionDetail>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: FpoActionPayload) => api.post<Wrapped<FpoActionDetail>>(BASE, payload).then(unwrap),

  update: (id: number, payload: Partial<FpoActionPayload>) =>
    api.patch<Wrapped<FpoActionDetail>>(`${BASE}${id}/`, payload).then(unwrap),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),
};
