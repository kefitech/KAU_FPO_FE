import { api } from "@/lib/api/client";
import type { AdminKVKLink } from "@/types/admin";

// Admin CRUD for the Krishi Vigyan Kendra (KVK) directory that powers the
// public /krishi-vigyan-kendra page. Mirrors the quickLinksApi client — same
// multipart-form-data upload shape for the logo file.

export const kvkLinksApi = {
  getAll: (): Promise<AdminKVKLink[]> =>
    api.get("/admin/kvk-links/").then((r) => (r.data as { data: AdminKVKLink[] }).data),

  create: (formData: FormData): Promise<AdminKVKLink> =>
    api.post("/admin/kvk-links/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminKVKLink }).data),

  update: (id: number, formData: FormData): Promise<AdminKVKLink> =>
    api.patch(`/admin/kvk-links/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminKVKLink }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/kvk-links/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/kvk-links/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/kvk-links/${id}/deactivate/`).then(() => undefined),
};
