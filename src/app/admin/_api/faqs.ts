import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export type FaqCategory = "fpo_general" | "schemes" | "platform_usage";

export interface AdminFaq {
  id: number;
  question: Record<string, string>;
  answer: Record<string, string>;
  category: FaqCategory;
  category_display: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

export interface FaqPayload {
  question: Record<string, string>;
  answer: Record<string, string>;
  category: FaqCategory;
  order?: number;
  is_active?: boolean;
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const adminFaqsApi = {
  getAll: (params?: DataTableParams): Promise<PaginatedResponse<AdminFaq>> =>
    api.get<PaginatedResponse<AdminFaq>>("/admin/faqs/", { params }).then((r) => r.data),

  getById: (id: number): Promise<AdminFaq> =>
    api.get<Wrapped<AdminFaq>>(`/admin/faqs/${id}/`).then(unwrap),

  create: (payload: FaqPayload): Promise<AdminFaq> =>
    api.post<Wrapped<AdminFaq>>("/admin/faqs/", payload).then(unwrap),

  update: (id: number, payload: Partial<FaqPayload>): Promise<AdminFaq> =>
    api.patch<Wrapped<AdminFaq>>(`/admin/faqs/${id}/`, payload).then(unwrap),

  delete: (id: number): Promise<void> =>
    api.delete(`/admin/faqs/${id}/`).then(() => undefined),
};
