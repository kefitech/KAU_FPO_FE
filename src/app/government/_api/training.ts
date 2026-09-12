import { api } from "@/lib/api/client";
import type { GovtTrainingSession, GovtTrainingSessionDetail, GovtTrainingSessionPayload } from "@/types/government";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/government/training-sessions/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const govtTrainingApi = {
  getAll: (params?: DataTableParams) =>
    api.get<PaginatedResponse<GovtTrainingSession>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<GovtTrainingSessionDetail>>(`${BASE}${id}/`).then(unwrap),
  create: (payload: GovtTrainingSessionPayload) =>
    api.post<Wrapped<{ id: number }>>(BASE, payload).then(unwrap),
  setAttendance: (id: number, attendance: { member_name: string; attended: boolean }[]) =>
    api.post<Wrapped<{ session_id: number; attendance_count: number }>>(`${BASE}${id}/attendance/`, { attendance }).then(unwrap),
};
