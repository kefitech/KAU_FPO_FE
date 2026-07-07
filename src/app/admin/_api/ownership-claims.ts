import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";
import type { AdminOwnershipClaim } from "@/types/admin";

function extractMessage(r: { data: unknown }): string {
  return (r.data as Record<string, string>)?.message ?? "";
}

export const adminOwnershipClaimsApi = {
  list: (params?: DataTableParams): Promise<PaginatedResponse<AdminOwnershipClaim>> =>
    api.get("/admin/ownership-claims/", { params }).then((r) => r.data as PaginatedResponse<AdminOwnershipClaim>),

  get: (id: number): Promise<AdminOwnershipClaim> =>
    api.get(`/admin/ownership-claims/${id}/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as AdminOwnershipClaim;
    }),

  approve: (id: number, notes: string): Promise<string> =>
    api.post(`/admin/ownership-claims/${id}/approve/`, { notes }).then(extractMessage),

  reject: (id: number, notes: string): Promise<string> =>
    api.post(`/admin/ownership-claims/${id}/reject/`, { notes }).then(extractMessage),

  requestDocuments: (id: number, message: string): Promise<string> =>
    api.post(`/admin/ownership-claims/${id}/request-documents/`, { notes: message }).then(extractMessage),
};
