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
  /** Portal role of the official who recorded the session. */
  conducted_by_role: "government" | "cbbo" | "admin" | "other";
  conducted_by_role_display: string;
  /** Designation (and department for government officials); empty when unknown. */
  conducted_by_detail: string;
  /** CBBO officers only: their organisation's name and type; empty otherwise. */
  conducted_by_organisation: string;
  /** Cancelled = removed by the official who recorded it. */
  status: "upcoming" | "completed" | "cancelled";
  status_display: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  created_at: string;
}

const BASE = "/fpo/training-sessions/";

export const fpoTrainingApi = {
  getAll: (params?: DataTableParams) =>
    api.get<PaginatedResponse<FPOTrainingSession>>(BASE, { params }).then((r) => r.data),
};
