import { api, apiClient } from "@/lib/api/client";
import type { BulkTranslationPayload, Translation, TranslationPayload } from "@/types";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/translations/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const translationApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<Translation>>(BASE, { params }).then((r) => r.data),

  getById: (id: number) => api.get<Wrapped<Translation>>(`${BASE}${id}/`).then(unwrap),

  create: (payload: TranslationPayload) => api.post<Translation>(BASE, payload).then((r) => r.data),

  update: (id: number, payload: Partial<TranslationPayload>) =>
    api.patch<Translation>(`${BASE}${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${BASE}${id}/`),

  verify: (id: number) => api.post(`${BASE}${id}/verify/`),

  bulkVerify: (ids: number[]) => api.post(`${BASE}bulk-verify/`, { ids }),

  bulkDelete: (ids: number[]) => api.post(`${BASE}bulk-delete/`, { ids }),

  bulkCreate: (payload: BulkTranslationPayload) => api.post(`${BASE}bulk_create/`, payload),

  importFile: (formData: FormData) =>
    apiClient.post(`${BASE}import_file/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  export: async (params: {
    language_code: string;
    category_code?: string;
    file_format?: "xlsx" | "csv";
  }): Promise<{ downloaded: true } | { downloaded: false; message: string }> => {
    const response = await apiClient.get(`${BASE}export/`, {
      params,
      responseType: "blob",
    });

    const contentType = response.headers["content-type"] as string | undefined;
    if (contentType?.includes("application/json")) {
      const text = await (response.data as Blob).text();
      const json = JSON.parse(text) as { message?: string };
      return { downloaded: false, message: json.message ?? "Nothing to export." };
    }

    const disposition = response.headers["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? `translations_${params.language_code}.${params.file_format ?? "xlsx"}`;

    const url = URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { downloaded: true };
  },
};
