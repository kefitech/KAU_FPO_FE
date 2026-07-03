import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";
import type { AdminOwnershipClaim } from "@/types/admin";

export const adminOwnershipClaimsApi = {
  list: (params?: DataTableParams): Promise<PaginatedResponse<AdminOwnershipClaim>> =>
    api.get("/admin/ownership-claims/", { params }).then((r) => r.data as PaginatedResponse<AdminOwnershipClaim>),

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
