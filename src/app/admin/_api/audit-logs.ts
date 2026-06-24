import { api } from "@/lib/api/client";
import type { AuditLog } from "@/types/admin";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/audit-logs/";

export const auditLogsApi = {
  getAll: (params: DataTableParams) => api.get<PaginatedResponse<AuditLog>>(BASE, { params }).then((r) => r.data),
};
