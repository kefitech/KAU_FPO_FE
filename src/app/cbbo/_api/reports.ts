import { api } from "@/lib/api/client";
import type {
  CBBOReportCreatePayload,
  CBBOReportDetail,
  CBBOReportEditPayload,
  CBBOReportListItem,
} from "@/types/cbbo";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/cbbo/reports/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

interface CBBOReportsApi {
  getAll: (params: DataTableParams) => Promise<PaginatedResponse<CBBOReportListItem>>;
  getById: (id: number) => Promise<CBBOReportDetail>;
  create: (payload: CBBOReportCreatePayload) => Promise<{ id: number; status: string }>;
  update: (id: number, payload: CBBOReportEditPayload) => Promise<{ id: number }>;
  submit: (id: number) => Promise<{ id: number; status: string }>;
}

export const cbboReportsApi: CBBOReportsApi = {
  getAll: (params) => api.get<PaginatedResponse<CBBOReportListItem>>(BASE, { params }).then((r) => r.data),
  getById: (id) => api.get<Wrapped<CBBOReportDetail>>(`${BASE}${id}/`).then(unwrap),
  create: (payload) => api.post<Wrapped<{ id: number; status: string }>>(BASE, payload).then(unwrap),
  update: (id, payload) => api.patch<Wrapped<{ id: number }>>(`${BASE}${id}/`, payload).then(unwrap),
  submit: (id) => api.post<Wrapped<{ id: number; status: string }>>(`${BASE}${id}/submit/`).then(unwrap),
};
