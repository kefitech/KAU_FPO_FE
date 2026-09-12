import { api } from "@/lib/api/client";
import type { AssignedFPO } from "@/types/cbbo";
import type { GovtFPODetail } from "@/types/government";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/government/fpos/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const govtFposApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<AssignedFPO>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<GovtFPODetail>>(`${BASE}${id}/`).then(unwrap),
};
