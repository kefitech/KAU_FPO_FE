import { api } from "@/lib/api/client";
import type { AdminQuickLink } from "@/types/admin";

export const quickLinksApi = {
  getAll: (): Promise<AdminQuickLink[]> =>
    api.get("/admin/quick-links/").then((r) => (r.data as { data: AdminQuickLink[] }).data),

  create: (formData: FormData): Promise<AdminQuickLink> =>
    api.post("/admin/quick-links/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminQuickLink }).data),

  update: (id: number, formData: FormData): Promise<AdminQuickLink> =>
    api.patch(`/admin/quick-links/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminQuickLink }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/quick-links/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/quick-links/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/quick-links/${id}/deactivate/`).then(() => undefined),
};
