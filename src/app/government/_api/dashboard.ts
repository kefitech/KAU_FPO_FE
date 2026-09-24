import { api } from "@/lib/api/client";
import type { GovtDashboardStats } from "@/types/government";

const BASE = "/government/dashboard/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const govtDashboardApi = {
  getStats: () => api.get<Wrapped<GovtDashboardStats>>(`${BASE}stats/`).then(unwrap),
};

