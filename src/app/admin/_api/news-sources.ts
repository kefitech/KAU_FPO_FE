import { api } from "@/lib/api/client";
import type { AdminNewsSource } from "@/types/admin";

export const newsSourcesApi = {
  getAll: (): Promise<AdminNewsSource[]> =>
    api.get("/admin/news-sources/").then((r) => (r.data as { data: AdminNewsSource[] }).data),

  create: (formData: FormData): Promise<AdminNewsSource> =>
    api.post("/admin/news-sources/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminNewsSource }).data),

  update: (id: number, formData: FormData): Promise<AdminNewsSource> =>
    api.patch(`/admin/news-sources/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminNewsSource }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/news-sources/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/news-sources/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/news-sources/${id}/deactivate/`).then(() => undefined),
};
