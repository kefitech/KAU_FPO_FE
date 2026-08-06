import { api } from "@/lib/api/client";
import type { AdminGalleryAlbum, AdminGalleryPhoto } from "@/types/admin";

export const galleryAlbumApi = {
  getAll: (): Promise<AdminGalleryAlbum[]> =>
    api.get("/admin/gallery/albums/").then((r) => (r.data as { data: AdminGalleryAlbum[] }).data),

  create: (data: { title: string; order?: number; is_active?: boolean }): Promise<AdminGalleryAlbum> =>
    api.post("/admin/gallery/albums/", data).then((r) => (r.data as { data: AdminGalleryAlbum }).data),

  update: (id: number, data: Partial<{ title: string; order: number; is_active: boolean }>): Promise<AdminGalleryAlbum> =>
    api.patch(`/admin/gallery/albums/${id}/`, data).then((r) => (r.data as { data: AdminGalleryAlbum }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/gallery/albums/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/gallery/albums/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/gallery/albums/${id}/deactivate/`).then(() => undefined),
};

export const galleryApi = {
  getAll: (albumId?: number): Promise<AdminGalleryPhoto[]> =>
    api.get("/admin/gallery/", { params: albumId ? { album_id: albumId } : {} })
      .then((r) => (r.data as { data: AdminGalleryPhoto[] }).data),

  create: (formData: FormData): Promise<AdminGalleryPhoto> =>
    api.post("/admin/gallery/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminGalleryPhoto }).data),

  bulkCreate: (formData: FormData): Promise<{ uploaded: AdminGalleryPhoto[]; errors: { file: string; error: string }[] }> =>
    api.post("/admin/gallery/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: { uploaded: AdminGalleryPhoto[]; errors: { file: string; error: string }[] } }).data),

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
