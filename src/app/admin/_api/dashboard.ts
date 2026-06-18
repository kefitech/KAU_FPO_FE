import { api } from "@/lib/api/client";
import type { AdminDashboardStats } from "@/types/admin";

export const adminDashboardApi = {
  getStats: (): Promise<AdminDashboardStats> =>
    api.get("/admin/dashboard/stats/").then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as AdminDashboardStats;
    }),
};
