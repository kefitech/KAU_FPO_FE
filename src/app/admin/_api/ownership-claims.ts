import { api } from "@/lib/api/client";
import type { AdminOwnershipClaim } from "@/types/admin";

export interface ClaimsListResponse {
  data: AdminOwnershipClaim[];
  meta: {
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  };
}

export const adminOwnershipClaimsApi = {
  list: (params?: { status?: string; page?: number }): Promise<ClaimsListResponse> =>
    api.get("/admin/ownership-claims/", { params }).then((r) => r.data as ClaimsListResponse),

  get: (id: number): Promise<AdminOwnershipClaim> =>
    api.get(`/admin/ownership-claims/${id}/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as AdminOwnershipClaim;
    }),

  approve: (id: number, notes: string): Promise<void> =>
    api.post(`/admin/ownership-claims/${id}/approve/`, { notes }).then(() => undefined),

  reject: (id: number, notes: string): Promise<void> =>
    api.post(`/admin/ownership-claims/${id}/reject/`, { notes }).then(() => undefined),
};
