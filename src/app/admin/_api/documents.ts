import { api } from "@/lib/api/client";
import type { AdminDocument } from "@/types/admin";

export const documentsApi = {
  getAll: (): Promise<AdminDocument[]> =>
    api.get("/admin/documents/").then((r) => (r.data as { data: AdminDocument[] }).data),

  create: (formData: FormData): Promise<AdminDocument> =>
    api.post("/admin/documents/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminDocument }).data),

  update: (id: number, formData: FormData): Promise<AdminDocument> =>
    api.patch(`/admin/documents/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminDocument }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/documents/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/documents/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/documents/${id}/deactivate/`).then(() => undefined),
};
