import { api } from "@/lib/api/client";
import type { FpoDashboard } from "@/types/fpo";

type Wrapped<T> = { status: string; message: string; data: T };

export const fpoDashboardApi = {
  get: () => api.get<Wrapped<FpoDashboard>>("/fpo/dashboard/").then((r) => r.data.data),
};
