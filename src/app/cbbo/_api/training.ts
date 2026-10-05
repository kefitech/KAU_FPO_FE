import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";
import type { TrainingSessionComment } from "@/types/training";

const BASE = "/cbbo/training/";

export type CbboTrainingSession = {
  id: number;
  fpo: number;
  fpo_name: string;
  district: string;
  topic: string;
  trainer_name: string;
  date: string;
  time: string;
  duration_hours: string | number;
  participants_count: number;
  venue: string;
  attendance_count: number;
  attendance_total: number;
  created_by_name: string;
  can_edit: boolean;
  /** KAU admin / sub-admin remarks, oldest first */
  comments: TrainingSessionComment[];
  /** true when a KAU comment arrived after this user last opened the session */
  has_unread_comments: boolean;
};

export type CbboAttendanceRow = { id?: number; member_name: string; attended: boolean };

export type CbboTrainingSessionDetail = Omit<
  CbboTrainingSession,
  "attendance_count" | "attendance_total" | "has_unread_comments"
> & {
  attendance: CbboAttendanceRow[];
  created_at: string;
  updated_at: string;
};

export type CbboTrainingSessionPayload = {
  fpo_application_ids: string[];
  topic: string;
  trainer_name: string;
  date: string;
  time: string;
  duration_hours: number;
  participants_count: number;
  venue: string;
};

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const cbboTrainingApi = {
  getAll: (params?: DataTableParams) =>
    api.get<PaginatedResponse<CbboTrainingSession>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<CbboTrainingSessionDetail>>(`${BASE}${id}/`).then(unwrap),
  // Returns the whole response (not unwrapped) so the page can show the server
  // message, which names any selected FPOs that were skipped.
  create: (payload: CbboTrainingSessionPayload) =>
    api.post<Wrapped<{ session_ids: number[]; not_found: string[] }>>(BASE, payload).then((r) => r.data),
  update: (id: number, payload: Partial<Omit<CbboTrainingSessionPayload, "fpo_application_ids">>) =>
    api.patch<Wrapped<CbboTrainingSessionDetail>>(`${BASE}${id}/`, payload).then(unwrap),
  remove: (id: number) => api.delete<Wrapped<null>>(`${BASE}${id}/`).then((r) => r.data),
  /** clears the unread KAU-comment marker for the current user */
  markCommentsRead: (id: number) => api.post(`${BASE}${id}/comments/read/`).then(() => undefined),
  setAttendance: (id: number, attendance: { member_name: string; attended: boolean }[]) =>
    api
      .post<Wrapped<{ session_id: number; attendance_count: number }>>(`${BASE}${id}/attendance/`, { attendance })
      .then(unwrap),
};

// The API client surfaces errors in two shapes across the app, and a validation
// failure sends `message` as an object of field errors. Handle all of them.
export function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as {
    data?: { message?: unknown };
    response?: { data?: { message?: unknown } };
  };
  const raw = e?.data?.message ?? e?.response?.data?.message;
  if (typeof raw === "string" && raw.trim() !== "") return raw;
  if (raw && typeof raw === "object") {
    const first = Object.values(raw as Record<string, unknown>)[0];
    const text = Array.isArray(first) ? first[0] : first;
    if (typeof text === "string" && text.trim() !== "") return text;
  }
  return fallback;
}
