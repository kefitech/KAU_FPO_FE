import { api } from "@/lib/api/client";
import type { AdminFeedback } from "@/types/admin";

export const feedbackApi = {
  getAll: (): Promise<AdminFeedback[]> =>
    api.get("/admin/feedback/").then((r) => (r.data as { data: AdminFeedback[] }).data),

  updateStatus: (id: number, status: AdminFeedback["status"]): Promise<AdminFeedback> =>
    api.patch(`/admin/feedback/${id}/`, { status }).then((r) => (r.data as { data: AdminFeedback }).data),
};
