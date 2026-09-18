import { api } from "@/lib/api/client";
import type { DataTableParams, PaginatedResponse } from "@/types/pagination";

export interface Inquiry {
  id: number;
  product: number;
  product_name: string;
  buyer: number;
  buyer_name: string;
  quantity_requested: string;
  message: string;
  status: "pending" | "contacted" | "resolved";
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
}

const BASE = "/marketplace/inquiries/";

export const inquiriesApi = {
  getAll: (params: DataTableParams): Promise<PaginatedResponse<Inquiry>> =>
    api.get(BASE, { params }).then((r) => r.data as PaginatedResponse<Inquiry>),

  markContacted: (id: number): Promise<void> => api.post(`${BASE}${id}/mark-contacted/`).then(() => undefined),

  markResolved: (id: number): Promise<void> => api.post(`${BASE}${id}/mark-resolved/`).then(() => undefined),
};
