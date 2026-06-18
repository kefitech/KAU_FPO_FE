import { api } from "@/lib/api/client";
import type { FpoClaim } from "@/types/fpo";

export const fpoClaimApi = {
  submit: (fpoId: number, reason: string): Promise<FpoClaim> =>
    api.post("/fpo/claim/", { fpo_id: fpoId, reason, supporting_doc_ids: [] }).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as FpoClaim;
    }),

  list: (): Promise<FpoClaim[]> =>
    api.get("/fpo/claim/").then((r) => {
      const d = r.data;
      return (Array.isArray(d) ? d : ((d as Record<string, unknown>).data ?? [])) as FpoClaim[];
    }),
};
