import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export type AnnouncementCategory = "announcement" | "news";

export interface AdminAnnouncement {
  id: number;
  title: Record<string, string>;
  body: Record<string, string>;
  category: AnnouncementCategory;
  category_display: string;
  published_date: string | null;
  is_active: boolean;
  order: number;
  created_at: string;
}

export interface AnnouncementPayload {
  title: Record<string, string>;
  body: Record<string, string>;
  category: AnnouncementCategory;
  published_date?: string | null;
  is_active?: boolean;
  order?: number;
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const adminAnnouncementsApi = {
  getAll: (params?: DataTableParams): Promise<PaginatedResponse<AdminAnnouncement>> =>
    api.get<PaginatedResponse<AdminAnnouncement>>("/admin/announcements/", { params }).then((r) => r.data),

  getById: (id: number): Promise<AdminAnnouncement> =>
    api.get<Wrapped<AdminAnnouncement>>(`/admin/announcements/${id}/`).then(unwrap),

  create: (payload: AnnouncementPayload): Promise<AdminAnnouncement> =>
    api.post<Wrapped<AdminAnnouncement>>("/admin/announcements/", payload).then(unwrap),

  update: (id: number, payload: Partial<AnnouncementPayload>): Promise<AdminAnnouncement> =>
    api.patch<Wrapped<AdminAnnouncement>>(`/admin/announcements/${id}/`, payload).then(unwrap),

  delete: (id: number): Promise<void> =>
    api.delete(`/admin/announcements/${id}/`).then(() => undefined),
};
