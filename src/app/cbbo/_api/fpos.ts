import { api } from "@/lib/api/client";
import type { AssignedFPO } from "@/types/cbbo";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/cbbo/fpos/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const cbboFposApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<AssignedFPO>>(BASE, { params }).then((r) => r.data),
  getById: (id: number) => api.get<Wrapped<AssignedFPO>>(`${BASE}${id}/`).then(unwrap),
};
