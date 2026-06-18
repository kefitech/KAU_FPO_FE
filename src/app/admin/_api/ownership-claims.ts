import { api } from "@/lib/api/client";
import type { AdminOwnershipClaim } from "@/types/admin";

export interface ClaimsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminOwnershipClaim[];
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
