import { api } from "@/lib/api/client";
import type { AdminGalleryPhoto } from "@/types/admin";

export const galleryApi = {
  getAll: (): Promise<AdminGalleryPhoto[]> =>
    api.get("/admin/gallery/").then((r) => (r.data as { data: AdminGalleryPhoto[] }).data),

  create: (formData: FormData): Promise<AdminGalleryPhoto> =>
    api.post("/admin/gallery/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminGalleryPhoto }).data),

  update: (id: number, formData: FormData): Promise<AdminGalleryPhoto> =>
    api.patch(`/admin/gallery/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminGalleryPhoto }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/gallery/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/gallery/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/gallery/${id}/deactivate/`).then(() => undefined),
};
