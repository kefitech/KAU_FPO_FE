import { api } from "@/lib/api/client";
import type { CBBODashboardStats } from "@/types/cbbo";

const BASE = "/cbbo/dashboard/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const cbboDashboardApi = {
  getStats: () => api.get<Wrapped<CBBODashboardStats>>(`${BASE}stats/`).then(unwrap),
};
