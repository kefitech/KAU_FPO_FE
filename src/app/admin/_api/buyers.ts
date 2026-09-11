import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

const BASE = "/admin/buyers/";

export type BuyerStatus = "pending" | "verified" | "rejected";

export interface AdminBuyer {
  id: number;
  name: string;
  organisation: string;
  contact_email: string;
  contact_phone: string;
  location: string;
  status: BuyerStatus;
  is_verified: boolean;
  fpo: number | null;
  user: number | null;
  account_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export const adminBuyersApi = {
  getAll: (params: DataTableParams): Promise<PaginatedResponse<AdminBuyer>> =>
    api.get(BASE, { params }).then((r) => r.data as PaginatedResponse<AdminBuyer>),

  verify: (id: number) => api.post(`${BASE}${id}/verify/`).then((r) => r.data),

  reject: (id: number) => api.post(`${BASE}${id}/reject/`).then((r) => r.data),

  deactivate: (id: number): Promise<void> => api.post(`${BASE}${id}/deactivate/`).then(() => undefined),

  activate: (id: number): Promise<void> => api.post(`${BASE}${id}/activate/`).then(() => undefined),

  resetPassword: (id: number): Promise<void> => api.post(`${BASE}${id}/reset-password/`).then(() => undefined),
};
