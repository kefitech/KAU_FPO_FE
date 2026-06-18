import { api } from "@/lib/api/client";
import type { FpoPermissionMatrix, FpoPermissionUpdate } from "@/types/admin";

const BASE = "/admin/fpo-permissions/";

type Wrapped<T> = { status: string; message: string; data: T };
const unwrap = <T>(r: { data: Wrapped<T> }) => r.data.data;

export const fpoPermissionsApi = {
  getMatrix: () => api.get<Wrapped<FpoPermissionMatrix>>(BASE).then(unwrap),

  bulkUpdate: (updates: FpoPermissionUpdate[]) => api.post(BASE, { updates }).then((r) => r.data),
};
