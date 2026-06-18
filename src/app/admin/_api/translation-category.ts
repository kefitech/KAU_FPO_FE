import { api } from "@/lib/api/client";
import type { TranslationCategory, TranslationCategoryPayload } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/translation-categories/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const translationCategoryApi = {
  getAll: (params: DataTableParams) =>
    api.get<PaginatedResponse<TranslationCategory>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<TranslationCategory>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: TranslationCategoryPayload) => api.post<TranslationCategory>(BASE, payload).then((r) => r.data),

  update: (id: number, payload: Partial<TranslationCategoryPayload>) =>
    api.patch<TranslationCategory>(`${BASE}${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${BASE}${id}/`),
};
