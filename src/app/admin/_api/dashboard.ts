import { api } from "@/lib/api/client";
import type { AdminDashboardStats, DistrictBlockStats } from "@/types/admin";

export const adminDashboardApi = {
  getStats: (): Promise<AdminDashboardStats> =>
    api.get("/admin/dashboard/stats/").then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as AdminDashboardStats;
    }),

  getDistrictBlocks: (district: string): Promise<DistrictBlockStats> =>
    api.get(`/admin/dashboard/districts/${district}/blocks/`).then((r) => {
      const d = r.data as Record<string, unknown>;
      return (d.data ?? d) as DistrictBlockStats;
    }),
};
