import { api } from "@/lib/api/client";
import type { Language, LanguagePayload } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/languages/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const languageApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<Language>>(BASE, { params }).then((r) => r.data),

  getActive: (): Promise<Language[]> =>
    api.get(BASE, { params: { is_active: true, page_size: 100 } }).then((r) => {
      const d = r.data as { data?: Language[] };
      return Array.isArray(d.data) ? d.data : [];
    }),

  getById: (id: number) => api.get<Wrapped<Language>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: LanguagePayload) => api.post<Language>(BASE, payload).then((r) => r.data),

  update: (id: number, payload: Partial<LanguagePayload>) =>
    api.patch<Language>(`${BASE}${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  activate: (id: number) => api.post(`${BASE}${id}/activate/`),

  deactivate: (id: number) => api.post(`${BASE}${id}/deactivate/`),

  setDefault: (id: number) => api.post(`${BASE}${id}/set_default/`),
};
