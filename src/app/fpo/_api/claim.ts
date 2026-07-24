import { api } from "@/lib/api/client";
import type { FpoClaim } from "@/types/fpo";

export const fpoClaimApi = {
  submit: (fpoId: number, reason: string, matchedField?: string): Promise<FpoClaim> =>
    api.post("/fpo/claim/", { fpo_id: fpoId, reason, supporting_doc_ids: [], matched_field: matchedField ?? "" }).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as FpoClaim;
    }),

  list: (): Promise<FpoClaim[]> =>
    api.get("/fpo/claim/").then((r) => {
      const d = r.data;
      return (Array.isArray(d) ? d : ((d as Record<string, unknown>).data ?? [])) as FpoClaim[];
    }),

  deleteDocument: (claimId: number, docId: string): Promise<void> =>
    api.delete(`/fpo/claim/${claimId}/documents/${docId}/`).then(() => undefined),

  uploadDocument: (claimId: number, file: File): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post(`/fpo/claim/${claimId}/documents/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => {
        const d = r.data as Record<string, unknown>;
        return (d.data ?? d) as { id: string };
      });
  },

  respond: (claimId: number, supportingDocIds: string[]): Promise<string> =>
    api.post(`/fpo/claim/${claimId}/respond/`, { supporting_doc_ids: supportingDocIds }).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.message as string) ?? "";
    }),
};
