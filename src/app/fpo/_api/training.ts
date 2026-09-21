import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface FPOTrainingSession {
  id: number;
  topic: string;
  trainer_name: string;
  date: string;
  time: string;
  duration_hours: string;
  venue: string;
  participants_count: number;
  conducted_by_name: string;
  created_at: string;
}

const BASE = "/fpo/training-sessions/";

export const fpoTrainingApi = {
  getAll: (params?: DataTableParams) =>
    api.get<PaginatedResponse<FPOTrainingSession>>(BASE, { params }).then((r) => r.data),
};
