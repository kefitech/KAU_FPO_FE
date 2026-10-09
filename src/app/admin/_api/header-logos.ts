import { api } from "@/lib/api/client";

export interface AdminHeaderLogo {
  id: number;
  name: string;
  name_ml: string;
  logo_url: string | null;
  is_platform: boolean;
  order: number;
  is_active: boolean;
  created_at: string;
}

export const headerLogosApi = {
  getAll: (): Promise<AdminHeaderLogo[]> =>
    api.get("/admin/header-logos/").then((r) => (r.data as { data: AdminHeaderLogo[] }).data),

  create: (formData: FormData): Promise<AdminHeaderLogo> =>
    api
      .post("/admin/header-logos/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => (r.data as { data: AdminHeaderLogo }).data),

  update: (id: number, formData: FormData): Promise<AdminHeaderLogo> =>
    api
      .patch(`/admin/header-logos/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => (r.data as { data: AdminHeaderLogo }).data),

  remove: (id: number): Promise<void> => api.delete(`/admin/header-logos/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> => api.post(`/admin/header-logos/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> => api.post(`/admin/header-logos/${id}/deactivate/`).then(() => undefined),

  reorder: (items: { id: number; order: number }[]): Promise<void> =>
    api.post("/admin/header-logos/reorder/", { items }).then(() => undefined),
};
