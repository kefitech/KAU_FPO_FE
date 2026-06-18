import { api } from "@/lib/api/client";

export interface AdminSiteBlock {
  block_key: string;
  content: Record<string, string>;
  is_active: boolean;
  updated_at: string;
}

export interface SiteBlockUpdatePayload {
  content: Record<string, string>;
  is_active?: boolean;
}

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export interface UpdateResult {
  data: AdminSiteBlock;
  message: string;
}

export const adminSiteContentApi = {
  getAll: (): Promise<AdminSiteBlock[]> =>
    api.get("/admin/site-content/").then((r) => {
      const d = r.data as Record<string, unknown>;
      return (Array.isArray(d.data) ? d.data : []) as AdminSiteBlock[];
    }),

  getByKey: (key: string): Promise<AdminSiteBlock> =>
    api.get<Wrapped<AdminSiteBlock>>(`/admin/site-content/${key}/`).then(unwrap),

  update: (key: string, payload: SiteBlockUpdatePayload): Promise<UpdateResult> =>
    api.patch<Wrapped<AdminSiteBlock>>(`/admin/site-content/${key}/`, payload).then((r) => ({
      data: r.data.data,
      message: r.data.message,
    })),
};
