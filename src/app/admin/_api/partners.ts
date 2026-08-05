import { api } from "@/lib/api/client";
import type { AdminPartner } from "@/types/admin";

export const partnersApi = {
  getAll: (): Promise<AdminPartner[]> =>
    api.get("/admin/partners/").then((r) => (r.data as { data: AdminPartner[] }).data),

  create: (formData: FormData): Promise<AdminPartner> =>
    api.post("/admin/partners/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminPartner }).data),

  update: (id: number, formData: FormData): Promise<AdminPartner> =>
    api.patch(`/admin/partners/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminPartner }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/partners/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/partners/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/partners/${id}/deactivate/`).then(() => undefined),
};
