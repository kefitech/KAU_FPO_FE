import { api } from "@/lib/api/client";
import type { AdminTeamMember } from "@/types/admin";

export const teamApi = {
  getAll: (): Promise<AdminTeamMember[]> =>
    api.get("/admin/team/").then((r) => (r.data as { data: AdminTeamMember[] }).data),

  create: (formData: FormData): Promise<AdminTeamMember> =>
    api.post("/admin/team/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminTeamMember }).data),

  update: (id: number, formData: FormData): Promise<AdminTeamMember> =>
    api.patch(`/admin/team/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => (r.data as { data: AdminTeamMember }).data),

  remove: (id: number): Promise<void> =>
    api.delete(`/admin/team/${id}/`).then(() => undefined),

  activate: (id: number): Promise<void> =>
    api.post(`/admin/team/${id}/activate/`).then(() => undefined),

  deactivate: (id: number): Promise<void> =>
    api.post(`/admin/team/${id}/deactivate/`).then(() => undefined),
};
